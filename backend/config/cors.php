<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Sanctum SPA usa cookies (credenciais) entre origens - não é possível
    // combinar '*' com supports_credentials=true, por isso listamos
    // explicitamente os dois pontos de entrada de desenvolvimento (nginx na
    // porta 80 e o Vite dev server directo na 5173); em produção ajustar para
    // o(s) domínio(s) reais.
    'allowed_origins' => ['http://localhost', 'http://localhost:5173'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
