// DEPRECATED: Old organizer layout is disabled.
// All organizers now use the shared (tabs) interface.
// This file redirects any accidental navigation to /(organizer)/* back to root.

import { Redirect } from 'expo-router';

export default function OrganizerTabsLayout() {
  // Redirect to root, which will send organizer to (tabs)/explore
  return <Redirect href="/" />;
}
