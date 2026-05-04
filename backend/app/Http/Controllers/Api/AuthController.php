<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json(['user' => $user, 'token' => $token]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'email'            => 'sometimes|email|unique:users,email,' . $user->id,
            'current_password' => 'required_with:password|string',
            'password'         => 'sometimes|string|min:8|confirmed',
        ]);

        if (isset($data['password'])) {
            if (!Hash::check($data['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Current password is incorrect.'],
                ]);
            }
            $data['password'] = Hash::make($data['password']);
        }

        unset($data['current_password']);
        $user->update($data);

        return response()->json($user->fresh());
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|max:5120', // 5 MB
        ]);

        $user = $request->user();
        $file = $request->file('avatar');

        // Deterministic path — overwrite old avatar automatically
        $ext      = $file->getClientOriginalExtension() ?: 'jpg';
        $filePath = "avatars/{$user->id}.{$ext}";

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('services.supabase.service_key'),
        ])->withOptions([
            'verify' => app()->isProduction(),
        ])->withBody(
            file_get_contents($file->getRealPath()),
            $file->getMimeType()
        )->put(
            config('services.supabase.url') . '/storage/v1/object/' . config('services.supabase.bucket') . '/' . $filePath
        );

        abort_if(!$response->successful(), 500, 'Avatar upload failed: ' . $response->body());

        // Bust cache with a timestamp query param so browsers reload the image
        $publicUrl = config('services.supabase.url')
            . '/storage/v1/object/public/'
            . config('services.supabase.bucket')
            . '/' . $filePath
            . '?t=' . time();

        $user->update(['avatar_url' => $publicUrl]);

        return response()->json($user->fresh());
    }

    public function removeAvatar(Request $request)
    {
        $user = $request->user();
        $user->update(['avatar_url' => null]);
        return response()->json($user->fresh());
    }
}