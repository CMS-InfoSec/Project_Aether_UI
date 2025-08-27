import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AdminFeedback() {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  
  // Character limits
  const maxCharacters = 2000;
  const charactersRemaining = maxCharacters - comment.length;
  const isOverLimit = charactersRemaining < 0;

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
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock API call to POST /feedback
      // In real implementation, this would be:
      // const response = await fetch('/feedback', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ comment: comment.trim() })
      // });

      // Simulate successful submission
      setComment('');
      setSubmitCount(prev => prev + 1);
      
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

        {/* Feedback Guidelines */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Feedback Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-green-600 mb-2 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Good Feedback Includes
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Specific details about issues or suggestions</li>
                  <li>Steps to reproduce problems</li>
                  <li>Expected vs actual behavior</li>
                  <li>Browser and system information if relevant</li>
                  <li>Screenshots or error messages when applicable</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-600 mb-2 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Types of Feedback
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Bug reports and technical issues</li>
                  <li>Feature requests and improvements</li>
                  <li>User experience feedback</li>
                  <li>Performance concerns</li>
                  <li>General suggestions for enhancement</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
