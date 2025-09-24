import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getJson, postJson } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminFeedback() {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Array<{id:string; comment:string; submittedBy:string; submittedAt:string; status:string}>>([]);
  
  // Character limits
  const maxCharacters = 2000;
  const charactersRemaining = maxCharacters - comment.length;
  const isOverLimit = charactersRemaining < 0;

  // Load existing feedback (admin view)
  const loadFeedback = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getJson<any>('/api/admin/feedback/all', { admin: true });
      const list = res?.data?.feedback || res?.feedback || [];
      setFeedback(list);
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadFeedback(); }, []);

  // Submit feedback
  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment before submitting",
        variant: "destructive"
      });
      return;
    }

    if (isOverLimit) {
      toast({
        title: "Error", 
        description: `Comment exceeds maximum length by ${Math.abs(charactersRemaining)} characters`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await postJson<any>('/api/feedback', { comment: comment.trim() });
      if (res?.status && res.status !== 'success') {
        throw new Error(res.error || res.message || 'Submission failed');
      }
      const created = res?.data || res;
      setComment('');
      setSubmitCount(prev => prev + 1);
      // Prepend to list for immediate feedback
      if (created && created.id) {
        setFeedback(prev => [created, ...prev]);
      } else {
        // fallback reload
        loadFeedback();
      }
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback. It has been successfully submitted.",
        duration: 5000
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle key shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground">
            Share your thoughts, suggestions, or report issues with the admin system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Submissions: {submitCount}
          </span>
          <Button variant="ghost" size="sm" onClick={loadFeedback} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Submit Feedback</span>
            </CardTitle>
            <CardDescription>
              Your feedback helps us improve the system. Please be as detailed as possible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Enter your feedback, suggestions, bug reports, or feature requests here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={8}
                className={`resize-none ${isOverLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              
              {/* Character Counter */}
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  Tip: Use Ctrl+Enter to submit quickly
                </div>
                <div className={`${
                  isOverLimit 
                    ? 'text-red-600 font-medium' 
                    : charactersRemaining < 100 
                      ? 'text-yellow-600' 
                      : 'text-muted-foreground'
                }`}>
                  {charactersRemaining} characters remaining
                </div>
              </div>
              
              {isOverLimit && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your comment is {Math.abs(charactersRemaining)} characters over the limit. 
                    Please shorten it before submitting.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                {comment.trim() ? `${comment.trim().length} / ${maxCharacters} characters` : 'No content entered'}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setComment('')}
                  disabled={!comment || isSubmitting}
                >
                  Clear
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!comment.trim() || isOverLimit || isSubmitting}
                  className="min-w-[100px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback History */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Recent Feedback</CardTitle>
            {loadError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 mr-2" /> Loading…
              </div>
            ) : feedback.length === 0 ? (
              <div className="text-sm text-muted-foreground">No feedback yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedback.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(item.submittedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {item.submittedBy}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={item.status === 'high_priority' ? 'destructive' : item.status === 'reviewed' ? 'secondary' : 'outline'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[700px]">
                          <div className="text-sm whitespace-pre-wrap break-words">{item.comment}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
