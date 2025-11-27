import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Search,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api, Student } from "@/services/api";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StudentFormData {
  name: string;
  email: string;
  studentRoll: string;
  password?: string;
}

const initialFormData: StudentFormData = {
  name: "",
  email: "",
  studentRoll: "",
  password: "",
};

export default function StudentManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const [formData, setFormData] = useState<StudentFormData>(initialFormData);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // CSV import state
  const [csvData, setCsvData] = useState<StudentFormData[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await api.getStudents();
      setStudents(data);
    } catch (error) {
      console.error("Failed to load students:", error);
      toast({
        title: "Error",
        description: "Failed to load students. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddStudent = async () => {
    if (!formData.name || !formData.email || !formData.studentRoll || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.createStudent({
        name: formData.name,
        email: formData.email,
        studentRoll: formData.studentRoll,
        password: formData.password,
      });
      toast({
        title: "Success",
        description: "Student added successfully.",
      });
      setIsAddDialogOpen(false);
      setFormData(initialFormData);
      loadStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add student.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudent = async () => {
    if (!editingStudent || !formData.name || !formData.email || !formData.studentRoll) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.updateStudent(editingStudent.id, {
        name: formData.name,
        email: formData.email,
        studentRoll: formData.studentRoll,
      });
      toast({
        title: "Success",
        description: "Student updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingStudent(null);
      setFormData(initialFormData);
      loadStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update student.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;

    setSubmitting(true);
    try {
      await api.deleteStudent(deletingStudent.id);
      toast({
        title: "Success",
        description: "Student deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setDeletingStudent(null);
      loadStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete student.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      studentRoll: student.studentId,
      password: "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (student: Student) => {
    setDeletingStudent(student);
    setIsDeleteDialogOpen(true);
  };

  // CSV Import functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setImportError("Please select a CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        
        if (lines.length < 2) {
          setImportError("CSV file must have a header row and at least one data row.");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const nameIndex = headers.findIndex((h) => h === "name");
        const emailIndex = headers.findIndex((h) => h === "email");
        const rollIndex = headers.findIndex((h) => h === "roll" || h === "studentroll" || h === "student_roll");
        const passwordIndex = headers.findIndex((h) => h === "password");

        if (nameIndex === -1 || emailIndex === -1 || rollIndex === -1) {
          setImportError("CSV must contain 'name', 'email', and 'roll' columns.");
          return;
        }

        const parsedData: StudentFormData[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          if (values.length >= 3) {
            parsedData.push({
              name: values[nameIndex] || "",
              email: values[emailIndex] || "",
              studentRoll: values[rollIndex] || "",
              password: passwordIndex !== -1 ? values[passwordIndex] : "defaultPass123",
            });
          }
        }

        if (parsedData.length === 0) {
          setImportError("No valid student data found in CSV.");
          return;
        }

        setCsvData(parsedData);
        setImportError(null);
        setIsImportDialogOpen(true);
      } catch (error) {
        setImportError("Failed to parse CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBulkImport = async () => {
    if (csvData.length === 0) return;

    setSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const student of csvData) {
      try {
        await api.createStudent({
          name: student.name,
          email: student.email,
          studentRoll: student.studentRoll,
          password: student.password || "defaultPass123",
        });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    toast({
      title: "Import Complete",
      description: `Successfully imported ${successCount} students. ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });

    setIsImportDialogOpen(false);
    setCsvData([]);
    loadStudents();
    setSubmitting(false);
  };

  const downloadTemplate = () => {
    const template = "name,email,roll,password\nJohn Doe,john@example.com,STU001,password123\nJane Smith,jane@example.com,STU002,password456";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 glass border-b border-border"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Student Management</h1>
          </div>
          <ThemeToggle />
        </div>
      </motion.header>

      <main className="container mx-auto p-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Actions Bar */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Template
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Student
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Students ({filteredStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{searchTerm ? "No students match your search." : "No students found."}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student, index) => (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-border/50"
                        >
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.studentId}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(student)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(student)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Enter the student's details below to create a new account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter student name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentRoll">Roll Number *</Label>
              <Input
                id="studentRoll"
                name="studentRoll"
                value={formData.studentRoll}
                onChange={handleInputChange}
                placeholder="Enter roll number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStudent} disabled={submitting}>
              {submitting ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student's information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter student name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-studentRoll">Roll Number *</Label>
              <Input
                id="edit-studentRoll"
                name="studentRoll"
                value={formData.studentRoll}
                onChange={handleInputChange}
                placeholder="Enter roll number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditStudent} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingStudent?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
            <DialogDescription>
              Review the students to be imported from the CSV file.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roll</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.map((student, index) => (
                  <TableRow key={index}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.studentRoll}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport} disabled={submitting}>
              {submitting ? "Importing..." : `Import ${csvData.length} Students`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Error Toast */}
      {importError && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg flex items-center gap-2">
          <span>{importError}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setImportError(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
