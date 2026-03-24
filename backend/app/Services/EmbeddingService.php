<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class EmbeddingService
{
    private string $baseUrl = 'http://host.docker.internal:11434';
    private string $model = 'nomic-embed-text';

    /**
     * Generate embedding for a single text.
     */
    public function getEmbedding(string $text): array
    {
        $response = Http::timeout(120)->post("{$this->baseUrl}/api/embeddings", [
            'model' => $this->model,
            'prompt' => $text,
        ]);

        $response->throw();

        return $response->json('embedding');
    }

    /**
     * Generate embeddings for multiple texts.
     */
    public function getEmbeddings(array $texts): array
    {
        if (empty($texts)) {
            return [];
        }

        $embeddings = [];
        foreach ($texts as $text) {
            $embeddings[] = $this->getEmbedding($text);
        }

        return $embeddings;
    }
}
