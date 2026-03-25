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
    public function index()
    {
        $documents = Document::with('categories')->get();
        return response()->json($documents);
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
            'category_ids' => 'sometimes|array',
            'category_ids.*' => 'exists:categories,id',
        ]);

        $file = $request->file('file');
        $path = $file->store('documents');

        $document = Document::create([
            'title' => $request->title,
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'status' => DocumentStatus::PENDING,
            'uploaded_by' => auth()->id(),
        ]);

        if ($request->has('category_ids')) {
            $document->categories()->sync($request->category_ids);
        }

        // Disparar Job para procesar el documento
        ProcessDocument::dispatch($document);

        return response()->json($document->load('categories'), 201);
    }

    public function show(Document $document)
    {
        $document->load(['categories', 'chunks' => function ($q) {
            $q->select('id', 'document_id', 'content', 'page_number', 'section', 'token_count');
        }]);
        return response()->json($document);
    }

    public function destroy(Document $document)
    {
        // Eliminar fichero físico
        if (Storage::exists($document->file_path)) {
            Storage::delete($document->file_path);
        }

        // Eliminar registro en BD (los chunks se eliminan por cascade en la migración)
        $document->delete();

        return response()->json(['message' => 'Documento eliminado correctamente']);
    }
}
