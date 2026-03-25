<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Chunk;
use App\Models\Document;
use App\Models\SemanticCache;
use App\Models\Setting;
use Anthropic\Laravel\Facades\Anthropic;

class RagService
{
    public function __construct(protected EmbeddingService $embeddingService)
    {
    }

    /**
     * Detecta la categoría más relevante para una consulta usando Claude.
     * Devuelve el modelo Category o null si no se detecta ninguna.
     */
    protected function detectCategory(string $question): ?Category
    {
        $categories = Category::pluck('name')->implode(', ');
        if (!$categories) {
            return null;
        }

        $response = Anthropic::messages()->create([
            'model'      => 'claude-haiku-4-5-20251001',
            'max_tokens' => 20,
            'messages'   => [[
                'role'    => 'user',
                'content' => "Analiza esta consulta técnica y devuelve SOLO el nombre de la categoría más relevante de esta lista: {$categories}. Si ninguna aplica, devuelve 'ninguna'. Consulta: {$question}",
            ]],
        ]);

        $detected = trim($response->content[0]->text ?? '');

        if (!$detected || strtolower($detected) === 'ninguna') {
            return null;
        }

        return Category::whereRaw('LOWER(name) = ?', [strtolower($detected)])->first();
    }

    /**
     * Realiza una consulta RAG.
     */
    public function query(string $question, array $categoryIds = []): array
    {
        // 1. Generar embedding de la pregunta
        $questionEmbedding = $this->embeddingService->getEmbedding($question);

        // 1b. Auto-detectar categoría si no se especificó ninguna
        $detectedCategory = null;
        if (empty($categoryIds)) {
            $cat = $this->detectCategory($question);
            if ($cat) {
                $categoryIds       = [$cat->id];
                $detectedCategory  = $cat->name;
            }
        }

        // 2. Buscar en caché semántica (similitud > 0.92)
        $cached = $this->findCachedResponse($questionEmbedding, $categoryIds);
        if ($cached) {
            return array_merge($cached, ['detected_category' => $detectedCategory]);
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
        $chunkDocumentIds = $relevantChunks->pluck('document_id')->unique()->values()->all();
        $summaries = Document::whereIn('id', $chunkDocumentIds)->pluck('summary', 'id');

        $summaryContext = "";
        foreach ($relevantChunks->pluck('document')->unique('id') as $doc) {
            $summary = $summaries[$doc->id] ?? null;
            if ($summary) {
                $summaryContext .= "[Doc: \"{$doc->title}\"] {$summary}\n";
            }
        }

        $chunksContext = "";
        $sources = [];
        foreach ($relevantChunks as $index => $chunk) {
            $sourceNum = $index + 1;
            $title     = $chunk->document->title;
            $page      = $chunk->page_number;
            $pageLabel = $page ? ", página {$page}" : "";

            $chunksContext .= "[Fuente {$sourceNum}: \"{$title}\"{$pageLabel}]\n{$chunk->content}\n\n";

            $sources[] = [
                'title'   => $title,
                'page'    => $page,
                'preview' => mb_substr($chunk->content, 0, 150),
            ];
        }

        $context  = $summaryContext ? "RESÚMENES DE DOCUMENTOS RELEVANTES:\n{$summaryContext}\nFRAGMENTOS ESPECÍFICOS:\n{$chunksContext}" : $chunksContext;

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
            'answer'             => $answer,
            'sources'            => $sources,
            'tokens_input'       => $response->usage->inputTokens ?? null,
            'tokens_output'      => $response->usage->outputTokens ?? null,
            'detected_category'  => $detectedCategory,
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

        // 1b. Auto-detectar categoría si no se especificó ninguna
        $detectedCategory = null;
        if (empty($categoryIds)) {
            $cat = $this->detectCategory($question);
            if ($cat) {
                $categoryIds      = [$cat->id];
                $detectedCategory = $cat->name;
            }
        }

        // 2. Buscar en caché semántica
        $cached = $this->findCachedResponse($questionEmbedding, $categoryIds);
        if ($cached) {
            return [
                'type'               => 'cached',
                'answer'             => $cached['answer'],
                'sources'            => $cached['sources'] ?? [],
                'detected_category'  => $detectedCategory,
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
        $chunkDocumentIds = $relevantChunks->pluck('document_id')->unique()->values()->all();
        $summaries = Document::whereIn('id', $chunkDocumentIds)->pluck('summary', 'id');

        $summaryContext = "";
        foreach ($relevantChunks->pluck('document')->unique('id') as $doc) {
            $summary = $summaries[$doc->id] ?? null;
            if ($summary) {
                $summaryContext .= "[Doc: \"{$doc->title}\"] {$summary}\n";
            }
        }

        $chunksContext = "";
        $sources = [];
        foreach ($relevantChunks as $index => $chunk) {
            $sourceNum = $index + 1;
            $title     = $chunk->document->title;
            $page      = $chunk->page_number;
            $pageLabel = $page ? ", página {$page}" : "";

            $chunksContext .= "[Fuente {$sourceNum}: \"{$title}\"{$pageLabel}]\n{$chunk->content}\n\n";

            $sources[] = [
                'title'   => $title,
                'page'    => $page,
                'preview' => mb_substr($chunk->content, 0, 150),
            ];
        }

        $context = $summaryContext ? "RESÚMENES DE DOCUMENTOS RELEVANTES:\n{$summaryContext}\nFRAGMENTOS ESPECÍFICOS:\n{$chunksContext}" : $chunksContext;

        return [
            'type'               => 'new',
            'context'            => $context,
            'sources'            => $sources,
            'embedding'          => $questionEmbedding,
            'category_ids'       => $categoryIds,
            'detected_category'  => $detectedCategory,
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
