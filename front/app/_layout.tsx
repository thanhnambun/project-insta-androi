import { Slot } from "expo-router";
import "react-native-reanimated";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
        <GluestackUIProvider mode="light">
          <QueryClientProvider client={queryClient}>
            <Slot />
          </QueryClientProvider>
        </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
