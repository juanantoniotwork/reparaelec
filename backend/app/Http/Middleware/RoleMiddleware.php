<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // $request->user()->role is an Enum instance (App\Enums\Role)
        // We compare its value (admin/tecnico) with the roles passed as string
        if (! in_array($request->user()->role->value, $roles)) {
            return response()->json([
                'message' => 'Acceso denegado. No tienes el rol necesario.'
            ], 403);
        }

        return $next($request);
    }
}
