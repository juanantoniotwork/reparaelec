<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = Setting::orderBy('key')->get();

        return response()->json($settings);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            '*.key'   => 'required|string|exists:settings,key',
            '*.value' => 'required|string',
        ]);

        foreach ($data as $item) {
            Setting::where('key', $item['key'])->update([
                'value'      => $item['value'],
                'updated_at' => now(),
            ]);
        }

        return response()->json(Setting::orderBy('key')->get());
    }
}
