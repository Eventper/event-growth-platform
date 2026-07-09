import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";

interface AiTestPayload {
  model: string;
  prompt: string;
  systemPrompt?: string;
}

interface AiTestResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  latencyMs: number;
}

function runAiTest(payload: AiTestPayload): Promise<AiTestResponse> {
  return fetch("/api/ai/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

export default function AiTest() {
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [prompt, setPrompt] = useState(
    "Write a short, compelling event description for a women's networking brunch in Milton Keynes."
  );
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a marketing copywriter for a women-focused events platform."
  );

  const mutation = useMutation({
    mutationFn: runAiTest,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Test</h1>
        <p className="text-muted-foreground">
          Test AI generation via OpenRouter. Use this to validate prompts and models.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                  <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku</SelectItem>
                  <SelectItem value="google/gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="system">System Prompt</Label>
              <Textarea
                id="system"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={2}
                placeholder="Optional system instructions..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">User Prompt</Label>
              <Textarea
                id="user"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                placeholder="Enter your prompt here..."
              />
            </div>

            <Button
              onClick={() =>
                mutation.mutate({
                  model,
                  prompt,
                  systemPrompt: systemPrompt || undefined,
                })
              }
              disabled={mutation.isPending || !prompt.trim()}
              className="w-full"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run AI Test
                </>
              )}
            </Button>

            {mutation.isError && (
              <p className="text-sm text-destructive">
                {mutation.error?.message}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!mutation.data && !mutation.isPending && (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-8 h-8 mx-auto mb-3" />
                <p>Run a prompt to see the AI output here.</p>
              </div>
            )}

            {mutation.isPending && (
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </div>
            )}

            {mutation.data && (
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                  {mutation.data.content}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md bg-muted p-2">
                    <div className="font-medium text-foreground">Model</div>
                    <div className="truncate">{mutation.data.model}</div>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <div className="font-medium text-foreground">Tokens</div>
                    <div>{mutation.data.usage.totalTokens}</div>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <div className="font-medium text-foreground">Latency</div>
                    <div>{mutation.data.latencyMs}ms</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
