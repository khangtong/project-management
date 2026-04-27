<?php

use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf('%s,%s', env('APP_URL'), env('FRONTEND_URL')))),

    'guard' => ['web'],

    'expiration' => null,

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => AuthenticateSession::class,
        'encrypt_cookies' => EncryptCookies::class,
        'validate_csrf_token' => ValidateCsrfToken::class,
    ],
];