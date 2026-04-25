import { useEffect } from "react";
import { RouterProvider, type Router } from "react-router-dom";
import { AppProviders } from "./components/AppProviders";
import { registerServiceWorker } from "./utils/sw-register";

function App({ router }: { router: Router }) {
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return <AppProviders><RouterProvider router={router} /></AppProviders>;
}

export default App;
