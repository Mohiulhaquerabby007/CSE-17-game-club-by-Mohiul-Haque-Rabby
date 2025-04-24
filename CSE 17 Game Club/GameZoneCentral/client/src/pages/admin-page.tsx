import { useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { User } from "@shared/schema";
import { BarChart, Activity, Users, Trophy } from "lucide-react";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/");
      toast({
        title: "Access Denied",
        description: "You do not have permission to access the admin panel.",
        variant: "destructive",
      });
    }
  }, [user, setLocation, toast]);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User deleted",
        description: "User has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold text-foreground">Admin Dashboard</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-foreground">Total Users</h3>
                    <Users className="text-accent h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
                  <p className="text-sm text-green-500">
                    <Activity className="h-3 w-3 inline mr-1" />
                    {stats?.userGrowth || 0}% from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-foreground">Active Games</h3>
                    <BarChart className="text-secondary h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats?.activeGames || 0}</p>
                  <p className="text-sm text-green-500">
                    <Activity className="h-3 w-3 inline mr-1" />
                    {stats?.gameGrowth || 0}% from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-foreground">Top Game</h3>
                    <Trophy className="text-destructive h-5 w-5" />
                  </div>
                  <p className="text-xl font-bold text-foreground">{stats?.topGame || "Type Racer"}</p>
                  <p className="text-sm text-muted-foreground">{stats?.topGamePercentage || 0}% of total gameplay</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-medium text-foreground">User Management</h3>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="new-username" className="text-right">Username</Label>
                          <Input id="new-username" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="new-password" className="text-right">Password</Label>
                          <Input id="new-password" type="password" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="new-role" className="text-right">Role</Label>
                          <select 
                            id="new-role" 
                            className="col-span-3 bg-background rounded-md border border-input px-3 py-2 text-sm"
                          >
                            <option value="user">User</option>
                            <option value="mediator">Mediator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button>Save User</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search users..."
                      className="w-48"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Games Played</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground mr-3">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">{user.username}</div>
                                <div className="text-sm text-muted-foreground">{user.email || "No email"}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'admin' 
                                ? 'bg-destructive/20 text-destructive' 
                                : user.role === 'mediator'
                                ? 'bg-accent/20 text-accent'
                                : 'bg-primary/20 text-primary'
                            }`}>
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          </TableCell>
                          <TableCell>
                            {user.gamesPlayed || 0}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" className="text-primary hover:text-primary/80 p-1 h-8">
                                    Edit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit User</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="edit-username" className="text-right">Username</Label>
                                      <Input id="edit-username" defaultValue={user.username} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="edit-role" className="text-right">Role</Label>
                                      <select 
                                        id="edit-role" 
                                        defaultValue={user.role}
                                        className="col-span-3 bg-background rounded-md border border-input px-3 py-2 text-sm"
                                      >
                                        <option value="user">User</option>
                                        <option value="mediator">Mediator</option>
                                        <option value="admin">Admin</option>
                                      </select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button>Save Changes</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" className="text-destructive hover:text-destructive/80 p-1 h-8">
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the user
                                      account and all associated data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteUserMutation.mutate(user.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
