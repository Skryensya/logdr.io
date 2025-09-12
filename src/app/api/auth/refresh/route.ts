import { NextRequest, NextResponse } from 'next/server';
import { jwtService } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401 }
      );
    }

    // Generate new access token
    const { accessToken, accessTokenExpiry } = await jwtService.refreshAccessToken(refreshToken);

    // Create response
    const response = NextResponse.json({
      success: true,
      accessTokenExpiry
    });

    // Set new access token cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: Math.floor((accessTokenExpiry - Date.now()) / 1000)
    };

    response.cookies.set('access_token', accessToken, cookieOptions);

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);
    
    // If refresh token is invalid, clear both tokens
    const response = NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    );

    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    return response;
  }
}

export async function DELETE() {
  // Logout - clear all tokens
  const response = NextResponse.json({ success: true });
  
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  
  return response;
}