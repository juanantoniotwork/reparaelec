<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        $query = Brand::with('category')->withCount('documents');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
        ]);

        $slug = Str::slug($validated['name']);

        $request->validate([
            'name' => Rule::unique('brands')->where(fn ($q) => $q->where('category_id', $validated['category_id'])),
        ]);

        $brand = Brand::create([
            'name'        => $validated['name'],
            'slug'        => $slug,
            'category_id' => $validated['category_id'],
        ]);

        return response()->json($brand->load('category'), 201);
    }

    public function update(Request $request, Brand $brand)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255',
                Rule::unique('brands')->where(fn ($q) => $q->where('category_id', $brand->category_id))->ignore($brand->id),
            ],
            'category_id' => 'sometimes|exists:categories,id',
        ]);

        $brand->update([
            'name'        => $validated['name'],
            'slug'        => Str::slug($validated['name']),
            'category_id' => $validated['category_id'] ?? $brand->category_id,
        ]);

        return response()->json($brand->load('category'));
    }

    public function destroy(Brand $brand)
    {
        $brand->delete();

        return response()->json(['message' => 'Marca eliminada correctamente']);
    }
}
