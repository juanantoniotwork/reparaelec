<?php

namespace App\Http\Controllers;

use App\Models\SessionChat;
use App\Models\Interaction;

class SessionController extends Controller
{
    public function destroy($id)
    {
        $session = SessionChat::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        Interaction::where('session_id', $id)->delete();
        $session->delete();

        return response()->json(['ok' => true]);
    }
}
