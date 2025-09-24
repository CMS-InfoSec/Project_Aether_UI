import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Access by Invitation Only</CardTitle>
          <CardDescription>
            This platform requires a founder invitation to create an account. If you believe you should have access, please contact a founder or administrator to receive an invitation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <Button onClick={() => navigate('/login')}>Back to Login</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
