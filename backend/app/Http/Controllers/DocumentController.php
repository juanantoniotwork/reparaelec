<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Enums\DocumentStatus;
use App\Jobs\ProcessDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = Document::with(['categories', 'brand']);

        if ($request->filled('category_id')) {
            $query->whereHas('categories', fn ($q) => $q->where('categories.id', $request->category_id));
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'file' => [
                'required',
                File::types(['pdf', 'doc', 'docx'])
                    ->max(1024 * 10), // 10MB
            ],
            'category_ids'   => 'sometimes|array',
            'category_ids.*' => 'exists:categories,id',
            'brand_id'       => 'nullable|exists:brands,id',
        ]);

        $file = $request->file('file');
        $path = $file->store('documents');

        $document = Document::create([
            'title'             => $request->title,
            'original_filename' => $file->getClientOriginalName(),
            'file_path'         => $path,
            'mime_type'         => $file->getMimeType(),
            'size'              => $file->getSize(),
            'status'            => DocumentStatus::PENDING,
            'uploaded_by'       => auth()->id(),
            'brand_id'          => $request->brand_id ?: null,
        ]);

        if ($request->has('category_ids')) {
            $document->categories()->sync($request->category_ids);
        }

        ProcessDocument::dispatch($document);

        return response()->json($document->load(['categories', 'brand']), 201);
    }

    public function show(Document $document)
    {
        $document->load(['categories', 'brand', 'chunks' => function ($q) {
            $q->select('id', 'document_id', 'content', 'page_number', 'section', 'token_count');
        }]);
        return response()->json($document);
    }

    public function update(Request $request, Document $document)
    {
        $request->validate([
            'title'          => 'required|string|max:255',
            'file'           => ['nullable', File::types(['pdf', 'doc', 'docx'])->max(1024 * 10)],
            'category_ids'   => 'sometimes|array',
            'category_ids.*' => 'exists:categories,id',
            'brand_id'       => 'nullable|exists:brands,id',
        ]);

        $document->title    = $request->title;
        $document->brand_id = $request->brand_id ?: null;

        if ($request->hasFile('file')) {
            if (Storage::exists($document->file_path)) {
                Storage::delete($document->file_path);
            }
            $file = $request->file('file');
            $document->original_filename = $file->getClientOriginalName();
            $document->file_path         = $file->store('documents');
            $document->mime_type         = $file->getMimeType();
            $document->size              = $file->getSize();
            $document->status            = DocumentStatus::PENDING;
        }

        $document->save();

        if ($request->has('category_ids')) {
            $document->categories()->sync($request->category_ids);
        }

        if ($request->hasFile('file')) {
            ProcessDocument::dispatch($document);
        }

        return response()->json($document->load(['categories', 'brand']));
    }

    public function destroy(Document $document)
    {
        if (Storage::exists($document->file_path)) {
            Storage::delete($document->file_path);
        }

        $document->delete();

        return response()->json(['message' => 'Documento eliminado correctamente']);
    }
}
