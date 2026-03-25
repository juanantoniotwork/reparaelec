<?php

namespace App\Jobs;

use App\Models\Document;
use App\Models\Chunk;
use App\Models\Setting;
use App\Enums\DocumentStatus;
use App\Services\EmbeddingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser as PdfParser;
use PhpOffice\PhpWord\IOFactory;
use Anthropic\Laravel\Facades\Anthropic;

class ProcessDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 600; // 10 minutos por si el archivo es grande

    public function __construct(protected Document $document)
    {
    }

    public function handle(EmbeddingService $embeddingService): void
    {
        try {
            $this->document->update(['status' => DocumentStatus::PROCESSING]);

            $text = $this->extractText();
            
            if (empty(trim($text))) {
                $this->document->update([
                    'summary' => "Este documento parece ser una imagen o un PDF escaneado sin capa de texto. Se requiere procesamiento OCR para extraer su contenido.",
                    'status' => DocumentStatus::PROCESSED
                ]);
                return;
            }

            // 1. Dividir en chunks según configuración
            $chunkSize = Setting::get('chunk_size', 2000);
            $chunks = $this->splitTextIntoChunks($text, $chunkSize, (int) ($chunkSize * 0.1));

            // 2. Generar embeddings y guardar chunks
            foreach ($chunks as $index => $chunkText) {
                $embedding = $embeddingService->getEmbedding($chunkText);
                
                Chunk::create([
                    'document_id' => $this->document->id,
                    'content' => $chunkText,
                    'page_number' => null, // Opcional: implementar si se desea
                    'token_count' => null,
                    'embedding' => $embedding,
                ]);
            }

            // 3. Generar resumen con Claude (Anthropic)
            $summary = $this->generateSummary($text);
            
            $this->document->update([
                'summary' => $summary,
                'status' => DocumentStatus::PROCESSED
            ]);

        } catch (\Exception $e) {
            \Log::error("Error procesando documento {$this->document->id}: " . $e->getMessage());
            $this->document->update(['status' => DocumentStatus::ERROR]);
        }
    }

    protected function extractText(): string
    {
        $path = Storage::path($this->document->file_path);
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if ($extension === 'pdf') {
            try {
                $parser = new PdfParser();
                $text = $parser->parseFile($path)->getText();
                
                // Si el texto está vacío, intentamos con pdftotext (si está instalado)
                if (empty(trim($text))) {
                    $output = [];
                    $returnVar = 0;
                    // -layout mantiene el formato visual, -q es modo silencioso
                    exec("pdftotext -layout -q " . escapeshellarg($path) . " -", $output, $returnVar);
                    
                    if ($returnVar === 0 && !empty($output)) {
                        $text = implode("\n", $output);
                    }
                }

                return $text;
            } catch (\Exception $e) {
                \Log::warning("Error usando Smalot\PdfParser: " . $e->getMessage());
                
                // Segundo intento con pdftotext en caso de fallo del parser
                $output = [];
                $returnVar = 0;
                exec("pdftotext -layout -q " . escapeshellarg($path) . " -", $output, $returnVar);
                
                if ($returnVar === 0 && !empty($output)) {
                    return implode("\n", $output);
                }
            }
        } 
        
        if (in_array($extension, ['doc', 'docx'])) {
            try {
                $phpWord = IOFactory::load($path);
                $text = '';
                foreach ($phpWord->getSections() as $section) {
                    foreach ($section->getElements() as $element) {
                        if (method_exists($element, 'getText')) {
                            $text .= $element->getText() . "\n";
                        }
                    }
                }
                return $text;
            } catch (\Exception $e) {
                \Log::error("Error procesando Word: " . $e->getMessage());
            }
        }

        return '';
    }

    protected function splitTextIntoChunks(string $text, int $size, int $overlap): array
    {
        $chunks = [];
        $textLength = mb_strlen($text);
        $start = 0;

        while ($start < $textLength) {
            $end = min($start + $size, $textLength);
            $chunks[] = mb_substr($text, $start, $end - $start);
            if ($end === $textLength) break;
            $start += ($size - $overlap);
        }

        return $chunks;
    }

    protected function generateSummary(string $text): string
    {
        // Limitar el texto para el resumen si es demasiado largo
        $content = mb_substr($text, 0, 30000); 

        $response = Anthropic::messages()->create([
            'model' => 'claude-haiku-4-5-20251001',
            'max_tokens' => 1024,
            'messages' => [
                [
                    'role' => 'user',
                    'content' => "Eres un asistente experto en reparaciones electrónicas. Resume este manual técnico de forma concisa, destacando los puntos clave y averías comunes si las hay:\n\n" . $content,
                ],
            ],
        ]);

        return $response->content[0]->text;
    }
}
