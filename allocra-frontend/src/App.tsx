import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import ToastContainer from "@/components/Toast";
import Dashboard from "@/pages/Dashboard";
import Team from "@/pages/Team";
import Tasks from "@/pages/Tasks";
import Allocation from "@/pages/Allocation";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/team" component={Team} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/allocation" component={Allocation} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <ToastContainer />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;