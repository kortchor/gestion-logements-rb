    return NextResponse.redirect(loginUrl);
  }

  // ✅ VÉRIFIER LA SIGNATURE DU TOKEN (Correctif de sécurité majeur)
  try {
    const payload = await verifyToken(token);
    if (!payload) {
      console.error('❌ [Middleware] Token invalide ou expiré');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    console.log('👤 [Middleware] Utilisateur:', payload.email, 'Rôle:', payload.role);
    const userRole = payload.role;

    // ✅ Vérification des permissions pour les routes SUPER_ADMIN
    if (SUPER_ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
      if (userRole !== 'super_admin') {
        console.log('⛔ [Middleware] Accès refusé (Super Admin requis) pour:', pathname);
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // ✅ Vérification des permissions pour les routes ADMIN
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
      if (userRole !== 'super_admin' && userRole !== 'admin') {
        console.log('⛔ [Middleware] Accès refusé (Admin requis) pour:', pathname);
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('❌ [Middleware] Erreur lors de la vérification du token:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\..*).*)',
  ],
}

