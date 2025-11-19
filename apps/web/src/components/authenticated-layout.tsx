import { Outlet } from "react-router";
import { AppSidebar } from "./app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./ui/sidebar";

export function AuthenticatedLayout() {
	return (
		<SidebarProvider defaultOpen={true}>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 px-4 md:hidden">
					<SidebarTrigger className="-ml-1" />
				</header>
				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
