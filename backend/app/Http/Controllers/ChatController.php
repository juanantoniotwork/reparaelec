<?php

namespace App\Http\Controllers;

use Anthropic\Laravel\Facades\Anthropic;
use App\Models\Interaction;
use App\Models\SemanticCache;
use App\Models\SessionChat;
use App\Services\RagService;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(protected RagService $ragService)
    {
    }

    public function query(Request $request)
    {
        $request->validate([
            'question' => 'required|string|max:1000',
            'category_ids' => 'sometimes|array',
            'category_ids.*' => 'exists:categories,id',
        ]);

        $startMs = (int) round(microtime(true) * 1000);
        $categoryIds = $request->category_ids ?? [];

        $result = $this->ragService->query($request->question, $categoryIds);

        $responseTimeMs = (int) round(microtime(true) * 1000) - $startMs;

        // Get or create a default session for this user
        $session = SessionChat::firstOrCreate(
            ['user_id' => auth()->id(), 'title' => 'default'],
            ['user_id' => auth()->id(), 'title' => 'default']
        );

        $interaction = Interaction::create([
            'session_id'         => $session->id,
            'user_id'            => auth()->id(),
            'query'              => $request->question,
            'response'           => $result['answer'],
            'model_used'         => 'haiku',
            'from_cache'         => $result['cached'] ?? false,
            'tokens_input'       => $result['tokens_input'] ?? null,
            'tokens_output'      => $result['tokens_output'] ?? null,
            'response_time_ms'   => $responseTimeMs,
            'detected_categories'=> $categoryIds,
        ]);

        return response()->json([
            'response'       => $result['answer'],
            'sources'        => $result['sources'],
            'interaction_id' => $interaction->id,
        ]);
    }

    public function suggestions()
    {
        $suggestions = SemanticCache::orderByDesc('hit_count')
            ->limit(4)
            ->get(['query', 'hit_count']);

        return response()->json($suggestions);
    }

    public function stream(Request $request)
    {
        $request->validate([
            'question'       => 'required|string|max:1000',
            'category_ids'   => 'sometimes|array',
            'category_ids.*' => 'exists:categories,id',
            'advanced'       => 'sometimes|boolean',
            'session_id'     => 'sometimes|integer|exists:sessions_chat,id',
        ]);

        $startMs     = (int) round(microtime(true) * 1000);
        $categoryIds = $request->category_ids ?? [];
        $question    = $request->question;
        $userId      = auth()->id();
        $advanced    = $request->boolean('advanced', false);
        $sessionId   = $request->session_id ?? null;

        // Prepara embedding, caché y contexto ANTES de abrir el stream
        $data = $this->ragService->prepareForStream($question, $categoryIds);

        return response()->stream(function () use ($data, $startMs, $question, $categoryIds, $userId, $advanced, $sessionId) {
            @ob_end_clean();
            ini_set('implicit_flush', '1');

            $fullAnswer  = '';
            $tokensInput = null;
            $tokensOutput = null;
            $fromCache   = false;

            if ($data['type'] === 'cached' || $data['type'] === 'empty') {
                // Stream de respuesta cacheada o vacía en trozos de ~15 caracteres
                $fromCache = ($data['type'] === 'cached');
                $answer    = $data['answer'];
                $len       = mb_strlen($answer);

                for ($i = 0; $i < $len; $i += 15) {
                    $chunk = mb_substr($answer, $i, 15);
                    echo 'data: ' . json_encode(['chunk' => $chunk]) . "\n\n";
                    flush();
                }
                $fullAnswer = $answer;
            } else {
                // Stream real desde Anthropic
                $model = $advanced ? 'claude-sonnet-4-5' : 'claude-haiku-4-5-20251001';
                $stream = Anthropic::messages()->createStreamed([
                    'model'      => $model,
                    'max_tokens' => 1000,
                    'system'     => 'Asistente técnico de reparaciones electrónicas. Responde SOLO con el contexto proporcionado. Cita [Fuente N]. Si no hay info, dilo brevemente.',
                    'messages'   => [
                        ['role' => 'user', 'content' => "Contexto:\n{$data['context']}\n\nPregunta: {$question}"],
                    ],
                ]);

                foreach ($stream as $event) {
                    if ($event->type === 'content_block_delta' && $event->delta->text !== null) {
                        $chunk       = $event->delta->text;
                        $fullAnswer .= $chunk;
                        echo 'data: ' . json_encode(['chunk' => $chunk]) . "\n\n";
                        flush();
                    }
                    if ($event->type === 'message_start') {
                        $tokensInput = $event->usage->inputTokens;
                    }
                    if ($event->type === 'message_delta') {
                        $tokensOutput = $event->usage->outputTokens;
                    }
                }

                // Guardar en caché semántica
                SemanticCache::create([
                    'query'        => $question,
                    'response'     => $fullAnswer,
                    'sources'      => $data['sources'],
                    'embedding'    => $data['embedding'],
                    'category_ids' => $categoryIds,
                    'hit_count'    => 0,
                ]);
            }

            // Guardar interacción
            $responseTimeMs = (int) round(microtime(true) * 1000) - $startMs;

            if ($sessionId) {
                $session = SessionChat::where('id', $sessionId)->where('user_id', $userId)->firstOrFail();
            } else {
                $session = SessionChat::firstOrCreate(
                    ['user_id' => $userId, 'title' => 'default'],
                    ['user_id' => $userId, 'title' => 'default']
                );
            }

            $interaction = Interaction::create([
                'session_id'          => $session->id,
                'user_id'             => $userId,
                'query'               => $question,
                'response'            => $fullAnswer,
                'model_used'          => $advanced ? 'sonnet' : 'haiku',
                'from_cache'          => $fromCache,
                'tokens_input'        => $tokensInput,
                'tokens_output'       => $tokensOutput,
                'response_time_ms'    => $responseTimeMs,
                'detected_categories' => $categoryIds,
            ]);

            // Evento final con fuentes e ID
            echo 'data: ' . json_encode([
                'sources'            => $data['sources'],
                'interaction_id'     => $interaction->id,
                'detected_category'  => $data['detected_category'] ?? null,
            ]) . "\n\n";

            echo "data: [DONE]\n\n";
            flush();
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache',
            'X-Accel-Buffering' => 'no',
            'Connection'        => 'keep-alive',
        ]);
    }
}
