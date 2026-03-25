<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            [
                'key'         => 'cache_threshold',
                'value'       => '0.92',
                'description' => 'Umbral de similitud para caché semántica (0–1). Consultas con similitud superior se sirven desde caché.',
                'type'        => 'float',
            ],
            [
                'key'         => 'rag_chunks',
                'value'       => '2',
                'description' => 'Número de fragmentos de documentos a recuperar en cada consulta RAG.',
                'type'        => 'integer',
            ],
            [
                'key'         => 'default_model',
                'value'       => 'claude-haiku-4-5-20251001',
                'description' => 'Modelo Claude utilizado para generar respuestas.',
                'type'        => 'string',
            ],
            [
                'key'         => 'max_tokens',
                'value'       => '1000',
                'description' => 'Número máximo de tokens en las respuestas del modelo.',
                'type'        => 'integer',
            ],
            [
                'key'         => 'chunk_size',
                'value'       => '2000',
                'description' => 'Tamaño en caracteres de cada fragmento al procesar documentos.',
                'type'        => 'integer',
            ],
            [
                'key'         => 'ollama_timeout',
                'value'       => '120',
                'description' => 'Tiempo de espera máximo en segundos para las peticiones a Ollama.',
                'type'        => 'integer',
            ],
        ];

        foreach ($settings as $setting) {
            DB::table('settings')->updateOrInsert(
                ['key' => $setting['key']],
                array_merge($setting, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
