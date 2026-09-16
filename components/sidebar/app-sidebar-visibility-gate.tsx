/** @format */

'use client';

import { useAppSidebarHidden } from './sidebar-visibility';

export function AppSidebarVisibilityGate({
	children,
}: {
	children: React.ReactNode;
}) {
	const hidden = useAppSidebarHidden();
	if (hidden) return null;
	return children;
}
