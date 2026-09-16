/** @format */

import {
	Sidebar,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarRail,
} from '@/components/ui/sidebar';
import { ComponentProps } from 'react';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';
import { AppSidebarVisibilityGate } from './app-sidebar-visibility-gate';

import ToogleSidebarBtn from './toogle-sidebar';

export function AppSidebar({
	props,
}: {
	props?: ComponentProps<typeof Sidebar>;
}) {
	return (
		<AppSidebarVisibilityGate>
			<Sidebar
				collapsible='icon'
				className='border-r-0'
				{...props}>
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<ToogleSidebarBtn />
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<NavMain />
				<SidebarFooter className='p-0'>
					<NavUser />
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
		</AppSidebarVisibilityGate>
	);
}
