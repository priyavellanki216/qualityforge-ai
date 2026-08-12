import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Workspace, { AuthenticatedWorkspace } from "./pages/Workspace";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/app" component={Workspace} /><Route path="/app/:section" component={Workspace} /><Route path="/workspace" component={AuthenticatedWorkspace} /><Route path="/workspace/:section" component={AuthenticatedWorkspace} /><Route component={Home} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark" switchable><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
