<?php

namespace App\Services;

use App\Models\Chunk;
use App\Models\SemanticCache;
use App\Models\Setting;
use Anthropic\Laravel\Facades\Anthropic;

class RagService
{
    public function __construct(protected EmbeddingService $embeddingService)
    {
    }

    /**
     * Realiza una consulta RAG.
     */
    public function query(string $question, array $categoryIds = []): array
    {
        // 1. Generar embedding de la pregunta
        $questionEmbedding = $this->embeddingService->getEmbedding($question);

        // 2. Buscar en caché semántica (similitud > 0.92)
        $cached = $this->findCachedResponse($questionEmbedding, $categoryIds);
        if ($cached) {
            return $cached;
        }

        // 3. Buscar los N chunks más similares
        $ragChunks = Setting::get('rag_chunks', 2);

        $chunksQuery = Chunk::query()
            ->select('chunks.*')
            ->join('documents', 'chunks.document_id', '=', 'documents.id')
            ->orderByRaw('embedding <-> ?', [json_encode($questionEmbedding)])
            ->limit($ragChunks);

        if (!empty($categoryIds)) {
            $chunksQuery->whereHas('document.categories', function ($q) use ($categoryIds) {
                $q->whereIn('categories.id', $categoryIds);
            });
        }

        $relevantChunks = $chunksQuery->get();

        if ($relevantChunks->isEmpty()) {
            return [
                'answer' => "No he encontrado información relevante en los manuales disponibles.",
                'sources' => [],
            ];
        }

        // 4. Construir contexto y sources
        $context = "";
        $sources = [];
        foreach ($relevantChunks as $index => $chunk) {
            $sourceNum = $index + 1;
            $title = $chunk->document->title;
            $page = $chunk->page_number;
            $pageLabel = $page ? ", página {$page}" : "";

            $context .= "[Fuente {$sourceNum}: \"{$title}\"{$pageLabel}]\n{$chunk->content}\n\n";

            $sources[] = [
                'title' => $title,
                'page' => $page,
                'preview' => mb_substr($chunk->content, 0, 150),
            ];
        }

        // 5. Llamar a Claude
        $model     = Setting::get('default_model', 'claude-haiku-4-5-20251001');
        $maxTokens = Setting::get('max_tokens', 1000);

        $response = Anthropic::messages()->create([
            'model' => $model,
            'max_tokens' => $maxTokens,
            'system' => 'Asistente técnico de reparaciones electrónicas. Responde SOLO con el contexto proporcionado. Cita [Fuente N]. Si no hay info, dilo brevemente.',
            'messages' => [
                ['role' => 'user', 'content' => "Contexto:\n{$context}\n\nPregunta: {$question}"]
            ],
        ]);

        $answer = $response->content[0]->text;

        // 6. Guardar en caché semántica
        SemanticCache::create([
            'query' => $question,
            'response' => $answer,
            'sources' => $sources,
            'embedding' => $questionEmbedding,
            'category_ids' => $categoryIds,
            'hit_count' => 0,
        ]);

        return [
            'answer'        => $answer,
            'sources'       => $sources,
            'tokens_input'  => $response->usage->inputTokens ?? null,
            'tokens_output' => $response->usage->outputTokens ?? null,
        ];
    }

    /**
     * Prepara el contexto para una respuesta en streaming.
     * Devuelve tipo 'cached'/'empty'/'new' con los datos necesarios.
     */
    public function prepareForStream(string $question, array $categoryIds = []): array
    {
        // 1. Generar embedding de la pregunta
        $questionEmbedding = $this->embeddingService->getEmbedding($question);

        // 2. Buscar en caché semántica
        $cached = $this->findCachedResponse($questionEmbedding, $categoryIds);
        if ($cached) {
            return [
                'type'    => 'cached',
                'answer'  => $cached['answer'],
                'sources' => $cached['sources'] ?? [],
            ];
        }

        // 3. Buscar los N chunks más similares
        $ragChunks = Setting::get('rag_chunks', 2);

        $chunksQuery = Chunk::query()
            ->select('chunks.*')
            ->join('documents', 'chunks.document_id', '=', 'documents.id')
            ->orderByRaw('embedding <-> ?', [json_encode($questionEmbedding)])
            ->limit($ragChunks);

        if (!empty($categoryIds)) {
            $chunksQuery->whereHas('document.categories', function ($q) use ($categoryIds) {
                $q->whereIn('categories.id', $categoryIds);
            });
        }

        $relevantChunks = $chunksQuery->get();

        if ($relevantChunks->isEmpty()) {
            return [
                'type'   => 'empty',
                'answer' => "No he encontrado información relevante en los manuales disponibles.",
                'sources' => [],
            ];
        }

        // 4. Construir contexto y sources
        $context = "";
        $sources = [];
        foreach ($relevantChunks as $index => $chunk) {
            $sourceNum = $index + 1;
            $title     = $chunk->document->title;
            $page      = $chunk->page_number;
            $pageLabel = $page ? ", página {$page}" : "";

            $context .= "[Fuente {$sourceNum}: \"{$title}\"{$pageLabel}]\n{$chunk->content}\n\n";

            $sources[] = [
                'title'   => $title,
                'page'    => $page,
                'preview' => mb_substr($chunk->content, 0, 150),
            ];
        }

        return [
            'type'        => 'new',
            'context'     => $context,
            'sources'     => $sources,
            'embedding'   => $questionEmbedding,
            'category_ids'=> $categoryIds,
        ];
    }

    /**
     * Busca respuesta en caché semántica con similitud > 0.92.
     */
    protected function findCachedResponse(array $embedding, array $categoryIds): ?array
    {
        // Distancia coseno: 1 - similitud. Para similitud > threshold, distancia < 1 - threshold
        $threshold     = Setting::get('cache_threshold', 0.92);
        $maxDistance   = 1 - $threshold;
        $embeddingJson = json_encode($embedding);

        $hit = SemanticCache::query()
            ->selectRaw('*, (embedding <=> ?) as distance', [$embeddingJson])
            ->whereRaw('(embedding <=> ?) < ?', [$embeddingJson, $maxDistance])
            ->whereRaw('category_ids::text = ?', [json_encode($categoryIds)])
            ->orderByRaw('embedding <=> ?', [$embeddingJson])
            ->first();

        if (!$hit) {
            return null;
        }

        $hit->increment('hit_count');

        return [
            'answer' => $hit->response,
            'sources' => $hit->sources ?? [],
            'cached' => true,
        ];
    }
}
