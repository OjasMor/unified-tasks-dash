import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}`);
          toast({
            title: "Connection Failed",
            description: `Slack connection failed: ${error}`,
            variant: "destructive",
          });
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing required parameters');
          toast({
            title: "Connection Failed",
            description: "Missing required OAuth parameters",
            variant: "destructive",
          });
          return;
        }

        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('error');
          setMessage('No active session found');
          toast({
            title: "Connection Failed",
            description: "Please sign in to connect Slack",
            variant: "destructive",
          });
          return;
        }

        // Call the Supabase Edge Function to handle the OAuth callback
        const response = await fetch('/functions/v1/slack-oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            action: 'handle_callback',
            code: code,
            state: state
          })
        });

        const result = await response.json();

        if (result.success) {
          setStatus('success');
          setMessage('Slack connected successfully!');
          toast({
            title: "Slack Connected",
            description: `Successfully connected to ${result.team_name || 'Slack'}`,
          });
          
          // Redirect back to the main page after a short delay
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to connect Slack');
          toast({
            title: "Connection Failed",
            description: result.error || "Failed to connect Slack",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
        toast({
          title: "Connection Failed",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card rounded-lg card-shadow p-8 w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Connecting to Slack...
            </h2>
            <p className="text-muted-foreground">
              Please wait while we complete the connection.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Connection Successful!
            </h2>
            <p className="text-muted-foreground mb-4">
              {message}
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Connection Failed
            </h2>
            <p className="text-muted-foreground mb-4">
              {message}
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
} 