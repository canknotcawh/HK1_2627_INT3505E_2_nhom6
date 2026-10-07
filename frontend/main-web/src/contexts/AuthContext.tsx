import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

import keycloak from '../lib/keycloak';
import { initKeycloak, scheduleTokenRefresh } from '../lib/auth';

export type Role = 'guest' | 'user';

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publishYear: number;
  rating: number;
  category: string;
  quantity: number;
  coverUrl: string | null;
};

export type LoanStatus = 'active' | 'pending_return' | 'returned' | 'overdue';

export type Loan = {
  id: string;
  bookId: string;
  userId: string;
  borrowDate: string;
  dueDate: string;
  status: LoanStatus;
};

// mock data
const INITIAL_BOOKS: Book[] = [
  { id: '1', title: 'Sapiens: Lược sử loài người', author: 'Yuval Noah Harari', isbn: '978-604-77-2897-1', publishYear: 2011, rating: 4.5, category: 'Khoa học', quantity: 3, coverUrl: null },
  { id: '2', title: 'Đắc Nhân Tâm', author: 'Dale Carnegie', isbn: '978-604-77-0393-0', publishYear: 1936, rating: 4.7, category: 'Kỹ năng sống', quantity: 5, coverUrl: null },
  { id: '3', title: 'Nhà Giả Kim', author: 'Paulo Coelho', isbn: '978-604-77-1079-2', publishYear: 1988, rating: 4.3, category: 'Văn học', quantity: 0, coverUrl: null },
  { id: '4', title: 'Dế Mèn phiêu lưu ký', author: 'Tô Hoài', isbn: '978-604-0-12345-6', publishYear: 1941, rating: 4.6, category: 'Văn học', quantity: 2, coverUrl: null },
  { id: '5', title: 'Lập trình với Python', author: 'Eric Matthes', isbn: '978-1-59327-584-3', publishYear: 2015, rating: 4.4, category: 'Công nghệ', quantity: 4, coverUrl: null },
  { id: '6', title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0-13-235088-4', publishYear: 2008, rating: 4.8, category: 'Công nghệ', quantity: 1, coverUrl: null },
  { id: '7', title: 'Tôi thấy hoa vàng trên cỏ xanh', author: 'Nguyễn Nhật Ánh', isbn: '978-604-1-05787-3', publishYear: 2010, rating: 4.5, category: 'Văn học', quantity: 3, coverUrl: null },
  { id: '8', title: 'Homo Deus: Lược sử tương lai', author: 'Yuval Noah Harari', isbn: '978-604-77-3542-9', publishYear: 2015, rating: 4.3, category: 'Khoa học', quantity: 2, coverUrl: null },
  { id: '9', title: 'Nghĩ giàu làm giàu', author: 'Napoleon Hill', isbn: '978-604-77-0112-7', publishYear: 1937, rating: 4.1, category: 'Kỹ năng sống', quantity: 0, coverUrl: null },
  { id: '10', title: 'Design Patterns', author: 'Gang of Four', isbn: '978-0-201-63361-0', publishYear: 1994, rating: 4.6, category: 'Công nghệ', quantity: 2, coverUrl: null },
];

const today = new Date();
const formatDate = (d: Date) => d.toISOString().split('T')[0];

// still mock data (at history page)
const INITIAL_LOANS: Loan[] = [
  {
    id: 'l1',
    bookId: '3',
    userId: 'user-1',
    borrowDate: formatDate(new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000)),
    dueDate: formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)),
    status: 'overdue',
  },
  {
    id: 'l2',
    bookId: '7',
    userId: 'user-1',
    borrowDate: formatDate(new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)),
    dueDate: formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)),
    status: 'active',
  },
];

type BorrowResult = { success: true } | { success: false; message: string };

interface AuthContextType {
  role: Role;
  initialized: boolean;
  username?: string;

  books: Book[];
  loans: Loan[];

  login: (idpHint?: string) => Promise<void>;
  forgotPassword: () => Promise<void>;
  logout: () => Promise<void>;

  borrowBook: (bookId: string) => BorrowResult;
  requestReturn: (loanId: string) => BorrowResult;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('guest');
  const [initialized, setInitialized] = useState(false);

  // Initialize Keycloak
  useEffect(() => {
    let refreshTimer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const initialize = async () => {
      try {
        const authenticated = await initKeycloak();
        if (cancelled) return;

        setRole(authenticated ? 'user' : 'guest');
        if (authenticated) {
          refreshTimer = scheduleTokenRefresh();
        }
      } catch (error) {
        console.error('Failed to initialize Keycloak:', error);
        if (!cancelled) {
          setRole('guest');
        }
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, []);

  // Login by Keycloak
  const login = useCallback(async (idpHint?: string) => {
    await keycloak.login({
      redirectUri: `${window.location.origin}/user`,
      ...(idpHint ? { idpHint } : {}),
    });
  }, []);

  const forgotPassword = useCallback(async () => {
    const resetUrl = new URL(await keycloak.createLoginUrl({
      redirectUri: `${window.location.origin}/login`,
    }));
    const authorizationPath = '/protocol/openid-connect/auth';

    if (!resetUrl.pathname.endsWith(authorizationPath)) {
      throw new Error('Không thể tạo đường dẫn quên mật khẩu Keycloak.');
    }

    resetUrl.pathname = `${resetUrl.pathname.slice(0, -authorizationPath.length)}/protocol/openid-connect/forgot-credentials`;
    window.location.assign(resetUrl.toString());
  }, []);

  // Logout by Keycloak
  const logout = useCallback(async () => {
    await keycloak.logout({
      redirectUri: `${window.location.origin}/`,
    });
    setRole('guest');
  }, []);

  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [loans, setLoans] = useState<Loan[]>(INITIAL_LOANS);

  const borrowBook = useCallback((bookId: string): BorrowResult => {
    if (role !== 'user') {
      return { success: false, message: 'Bạn cần đăng nhập để mượn sách.' };
    }

    const book = books.find(b => b.id === bookId);
    if (!book) {
      return { success: false, message: 'Không tìm thấy sách.' };
    }
    if (book.quantity <= 0) {
      return { success: false, message: 'Sách đã hết, vui lòng quay lại sau.' };
    }

    // quantity decreased
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, quantity: b.quantity - 1 } : b));

    // add loan record
    const newLoan: Loan = {
      id: `l${Date.now()}`,
      bookId,
      userId: 'user-1',
      borrowDate: formatDate(new Date()),
      dueDate: formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
      status: 'active',
    };
    setLoans(prev => [...prev, newLoan]);

    return { success: true };
  }, [role, books]);

  const requestReturn = useCallback((loanId: string): BorrowResult => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) {
      return { success: false, message: 'Không tìm thấy khoản mượn.' };
    }
    if (loan.status !== 'active' && loan.status !== 'overdue') {
      return { success: false, message: 'Khoản mượn này không thể trả.' };
    }

    // pending_return
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'pending_return' as LoanStatus } : l));

    return { success: true };
  }, [loans]);

  const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.name || keycloak.tokenParsed?.email;

  return (
    <AuthContext.Provider value={{ role, initialized, username, books, loans, login, forgotPassword, logout, borrowBook, requestReturn }}>
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
