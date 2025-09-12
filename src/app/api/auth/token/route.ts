import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { jwtService } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Get NextAuth session
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Generate JWT token pair
    const tokenPair = await jwtService.generateTokenPair(
      session.user.email, // Using email as userId
      session.user.email,
      session.user.name || undefined
    );

    // Create response with secure cookies
    const response = NextResponse.json({
      success: true,
      accessTokenExpiry: tokenPair.accessTokenExpiry,
      refreshTokenExpiry: tokenPair.refreshTokenExpiry
    });

    // Set secure httpOnly cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/'
    };

    response.cookies.set('access_token', tokenPair.accessToken, {
      ...cookieOptions,
      maxAge: Math.floor((tokenPair.accessTokenExpiry - Date.now()) / 1000)
    });

    response.cookies.set('refresh_token', tokenPair.refreshToken, {
      ...cookieOptions,
      maxAge: Math.floor((tokenPair.refreshTokenExpiry - Date.now()) / 1000)
    });

    return response;

  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate tokens' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get tokens from cookies
    const accessToken = request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token found' },
        { status: 401 }
      );
    }

    // Verify access token
    const payload = await jwtService.verifyToken(accessToken);

    return NextResponse.json({
      valid: true,
      payload: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        exp: payload.exp,
        iat: payload.iat
      },
      hasRefreshToken: !!refreshToken
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}