<?php

namespace App\Http\Controllers;

use App\Models\Interaction;
use Illuminate\Http\Request;

class InteractionController extends Controller
{
    public function index(Request $request)
    {
        $query = Interaction::where('user_id', auth()->id());

        if ($request->filled('session_id')) {
            $query->where('session_id', $request->session_id);
        }

        $interactions = $query->orderBy('created_at', 'desc')
            ->get(['id', 'query', 'response', 'feedback', 'created_at', 'session_id']);

        return response()->json($interactions);
    }

    public function adminIndex(Request $request)
    {
        $query = Interaction::with('user:id,name')
            ->orderBy('created_at', 'desc');

        if ($request->filled('feedback')) {
            if ($request->feedback === 'none') {
                $query->whereNull('feedback');
            } else {
                $query->where('feedback', $request->feedback);
            }
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $interactions = $query->get([
            'id', 'user_id', 'query', 'response', 'feedback',
            'created_at', 'response_time_ms', 'from_cache',
        ]);

        return response()->json($interactions);
    }

    public function feedback(Request $request, Interaction $interaction)
    {
        $request->validate([
            'feedback' => 'required|in:positive,negative',
        ]);

        // Only the owner can rate their interaction
        if ($interaction->user_id !== auth()->id()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $interaction->update(['feedback' => $request->feedback]);

        return response()->json(['ok' => true]);
    }
}
