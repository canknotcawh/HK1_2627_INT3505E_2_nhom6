import { createContext, useContext, useState, ReactNode } from 'react';

// Types
export type Role = 'guest' | 'user';

export type Book = {
  id: string;
  title: string;
  author: string;
  status: 'available' | 'borrowed';
};

export type Loan = {
  id: string;
  bookId: string;
  userId: string;
  borrowDate: string;
  dueDate: string;
  status: 'active' | 'returned' | 'overdue';
};

// Initial Mock Data
const INITIAL_BOOKS: Book[] = [
  { id: '1', title: 'Sapiens: Lược sử loài người', author: 'Yuval Noah Harari', status: 'available' },
  { id: '2', title: 'Đắc Nhân Tâm', author: 'Dale Carnegie', status: 'available' },
  { id: '3', title: 'Nhà Giả Kim', author: 'Paulo Coelho', status: 'borrowed' },
];

const INITIAL_LOANS: Loan[] = [
  { id: 'l1', bookId: '3', userId: 'user-1', borrowDate: '2023-10-01', dueDate: '2023-10-15', status: 'active' },
];

interface AuthContextType {
  role: Role;
  books: Book[];
  loans: Loan[];
  login: () => void;
  logout: () => void;
  borrowBook: (bookId: string) => void;
  returnBook: (loanId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('guest');
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [loans, setLoans] = useState<Loan[]>(INITIAL_LOANS);

  const login = () => setRole('user');
  const logout = () => setRole('guest');

  const borrowBook = (bookId: string) => {
    // Only 'user' can borrow
    if (role !== 'user') return;

    // Update book status
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: 'borrowed' } : b));

    // Add loan record
    const newLoan: Loan = {
      id: `l${Date.now()}`,
      bookId,
      userId: 'user-1', // Mock user id
      borrowDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days later
      status: 'active'
    };
    setLoans(prev => [...prev, newLoan]);
  };

  const returnBook = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    // Update loan status
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'returned' } : l));
    // Update book status
    setBooks(prev => prev.map(b => b.id === loan.bookId ? { ...b, status: 'available' } : b));
  };

  return (
    <AuthContext.Provider value={{ role, books, loans, login, logout, borrowBook, returnBook }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
