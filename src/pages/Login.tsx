import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GraduationCap, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock authentication
    if (username && password) {
      toast({
        title: "Login Successful",
        description: `Welcome, ${username}!`,
      });
      
      if (role === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/student");
      }
    } else {
      toast({
        title: "Login Failed",
        description: "Please enter username and password",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-primary">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card p-8 shadow-lg">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Smart Attendance</h1>
            <p className="text-muted-foreground">Sign in to continue</p>
          </motion.div>

          {/* Role Selection */}
          <div className="flex gap-4 mb-6">
            <Button
              type="button"
              variant={role === "teacher" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setRole("teacher")}
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Teacher
            </Button>
            <Button
              type="button"
              variant={role === "student" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setRole("student")}
            >
              <User className="w-4 h-4 mr-2" />
              Student
            </Button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50"
              />
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button type="submit" className="w-full gradient-primary">
                Sign In
              </Button>
            </motion.div>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Demo: Use any username/password to login
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
