import { auth } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ request, url }) => {
  const sessionData = await auth.api.getSession({
    headers: request.headers
  });

  if (!sessionData?.session && url.pathname !== '/login' && url.pathname !== '/') {
    throw redirect(303, '/login');
  }

  return { 
    session: sessionData?.session || null,
    user: sessionData?.user || null 
  };
};
