<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Interaction;
use App\Models\SemanticCache;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function index()
    {
        // --- Totales ---
        $totalDocuments   = Document::count();
        $totalUsers       = DB::table('users')->count();
        $totalInteractions = Interaction::count();
        $totalChunks      = DB::table('chunks')->count();

        // --- Interacciones últimos 7 días agrupadas por día ---
        $interactionsByDay = Interaction::query()
            ->selectRaw("DATE(created_at) as day, COUNT(*) as total")
            ->where('created_at', '>=', now()->subDays(6)->startOfDay())
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('total', 'day');

        // Rellenar días sin datos con 0
        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $days[$date] = $interactionsByDay[$date] ?? 0;
        }

        // --- Top 5 preguntas más frecuentes ---
        $topQuestions = Interaction::query()
            ->selectRaw("query, COUNT(*) as total")
            ->groupBy('query')
            ->orderByDesc('total')
            ->limit(5)
            ->get(['query', 'total']);

        // --- Feedback ---
        $totalFeedback  = Interaction::whereNotNull('feedback')->count();
        $positiveFeedback = Interaction::where('feedback', 'positive')->count();
        $negativeFeedback = Interaction::where('feedback', 'negative')->count();
        $feedbackRate = $totalFeedback > 0
            ? round(($positiveFeedback / $totalFeedback) * 100, 1)
            : null;

        // --- Tokens y coste estimado ---
        $totalTokensInput  = (int) Interaction::whereNotNull('tokens_input')->sum('tokens_input');
        $totalTokensOutput = (int) Interaction::whereNotNull('tokens_output')->sum('tokens_output');
        // Precios claude-haiku-4 ($/token): input=0.0000008, output=0.000004 · tipo cambio 0.92 €/$
        $estimatedCostEur = round(
            ($totalTokensInput * 0.0000008 + $totalTokensOutput * 0.000004) * 0.92,
            4
        );

        // --- Caché semántica ---
        $cacheEntries   = SemanticCache::count();
        $cacheHits      = SemanticCache::sum('hit_count');
        $cacheHitRate   = $totalInteractions > 0
            ? round(($cacheHits / $totalInteractions) * 100, 1)
            : 0;

        return response()->json([
            'totals' => [
                'documents'    => $totalDocuments,
                'users'        => $totalUsers,
                'interactions' => $totalInteractions,
                'chunks'       => $totalChunks,
            ],
            'tokens' => [
                'input'             => $totalTokensInput,
                'output'            => $totalTokensOutput,
                'total'             => $totalTokensInput + $totalTokensOutput,
                'estimated_cost_eur'=> $estimatedCostEur,
            ],
            'interactions_by_day' => $days,
            'top_questions'       => $topQuestions,
            'feedback' => [
                'positive'     => $positiveFeedback,
                'negative'     => $negativeFeedback,
                'total'        => $totalFeedback,
                'positive_pct' => $feedbackRate,
            ],
            'cache' => [
                'entries'   => $cacheEntries,
                'hits'      => (int) $cacheHits,
                'hit_rate'  => $cacheHitRate,
            ],
        ]);
    }
}
