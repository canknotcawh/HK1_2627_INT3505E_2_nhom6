import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

import keycloak from '../lib/keycloak';
import { initKeycloak, scheduleTokenRefresh } from '../lib/auth';
import { fetchBooks } from '../lib/books-api';
import { fetchMyLoans, borrowBook as apiBorrowBook, returnBook as apiReturnBook } from '../lib/loans-api';
import type { BookDTO } from '../lib/books-api';
import type { LoanDTO } from '../lib/loans-api';

export type Role = 'guest' | 'user';

export type Book = {
  id: string;
  title: string;
  authors: string[];
  author: string;
  isbn: string | null;
  publishYear: number | null;
  rating: number;
  ratingCount: number;
  categories: string[];
  category: string;
  quantity: number;
  coverUrl: string | null;
  subtitle: string | null;
  description: string | null;
  language: string | null;
  pageCount: number | null;
  status: string;
};

export type LoanStatus =
  | 'active' | 'pending_return' | 'returned' | 'overdue' | 'lost'
  | 'ACTIVE' | 'PENDING_RETURN' | 'RETURNED' | 'OVERDUE' | 'LOST';

export type Loan = {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  borrowDate: string;
  dueDate: string;
  returnedAt: string | null;
  status: LoanStatus;
  renewedCount: number;
};

type BorrowResult = { success: true; loan: Loan } | { success: false; message: string };
type ReturnResult = { success: true; loan: Loan } | { success: false; message: string };

/** Map backend BookDTO → frontend Book */
function mapBook(dto: BookDTO): Book {
  return {
    id: dto.id,
    title: dto.title,
    authors: dto.authors ?? [],
    author: (dto.authors ?? [])[0] ?? '',
    isbn: dto.isbn13,
    publishYear: dto.publishedYear,
    rating: dto.ratingAvg != null ? Number(dto.ratingAvg) : 0,
    ratingCount: dto.ratingCount ?? 0,
    categories: dto.categories ?? [],
    category: (dto.categories ?? [])[0] ?? '',
    quantity: dto.availableCopies,
    coverUrl: dto.coverImageUrl,
    subtitle: dto.subtitle,
    description: dto.description,
    language: dto.language,
    pageCount: dto.pageCount,
    status: dto.status,
  };
}

/** Map backend LoanDTO → frontend Loan */
function mapLoan(dto: LoanDTO): Loan {
  return {
    id: dto.id,
    bookId: dto.bookId,
    bookTitle: dto.bookTitle,
    userId: dto.userId,
    borrowDate: dto.borrowedAt,
    dueDate: dto.dueAt,
    returnedAt: dto.returnedAt,
    status: dto.status as LoanStatus,
    renewedCount: dto.renewedCount,
  };
}

interface AuthContextType {
  role: Role;
  initialized: boolean;
  username?: string;

  books: Book[];
  booksLoading: boolean;
  booksError: string | null;
  refetchBooks: () => Promise<void>;

  loans: Loan[];
  loansLoading: boolean;
  loansError: string | null;
  refetchLoans: () => Promise<void>;

  login: (idpHint?: string) => Promise<void>;
  forgotPassword: () => Promise<void>;
  logout: () => Promise<void>;

  borrowBook: (bookId: string) => Promise<BorrowResult>;
  requestReturn: (loanId: string) => Promise<ReturnResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('guest');
  const [initialized, setInitialized] = useState(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [loansError, setLoansError] = useState<string | null>(null);

  // Book fetching
  const refetchBooks = useCallback(async () => {
    setBooksLoading(true);
    setBooksError(null);
    try {
      const page = await fetchBooks({ size: 100 });
      setBooks(page.content.map(mapBook));
    } catch (err) {
      console.error('Failed to load books:', err);
      setBooksError('Không thể tải danh sách sách. Vui lòng thử lại.');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  // Loan fetching (only when logged in)
  const refetchLoans = useCallback(async () => {
    setLoansLoading(true);
    setLoansError(null);
    try {
      const page = await fetchMyLoans({ size: 100 });
      setLoans(page.content.map(mapLoan));
    } catch (err) {
      console.error('Failed to load loans:', err);
      setLoansError('Không thể tải lịch sử mượn sách. Vui lòng thử lại.');
    } finally {
      setLoansLoading(false);
    }
  }, []);

  // Initialize Keycloak
  useEffect(() => {
    let refreshTimer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const initialize = async () => {
      try {
        const authenticated = await initKeycloak();
        if (cancelled) return;

        const newRole: Role = authenticated ? 'user' : 'guest';
        setRole(newRole);
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

  // Fetch books once initialized
  useEffect(() => {
    if (initialized) {
      refetchBooks();
    }
  }, [initialized, refetchBooks]);

  // Fetch loans once logged in
  useEffect(() => {
    if (initialized && role === 'user') {
      refetchLoans();
    } else if (role === 'guest') {
      setLoans([]);
    }
  }, [initialized, role, refetchLoans]);

  // Auth actions
  const login = useCallback(async (idpHint?: string) => {
    await keycloak.login({
      redirectUri: `${window.location.origin}/`,
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

  const logout = useCallback(async () => {
    await keycloak.logout({
      redirectUri: `${window.location.origin}/`,
    });
    setRole('guest');
  }, []);

  // Borrow / Return
  const borrowBook = useCallback(async (bookId: string): Promise<BorrowResult> => {
    if (role !== 'user') {
      return { success: false, message: 'Bạn cần đăng nhập để mượn sách.' };
    }
    try {
      const dto = await apiBorrowBook(bookId);
      const loan = mapLoan(dto);
      setLoans(prev => [...prev, loan]);
      // Decrease available copies optimistically
      setBooks(prev =>
        prev.map(b => b.id === bookId ? { ...b, quantity: Math.max(0, b.quantity - 1) } : b)
      );
      return { success: true, loan };
    } catch (err: unknown) {
      const message = extractErrorMessage(err) ?? 'Không thể mượn sách. Vui lòng thử lại.';
      return { success: false, message };
    }
  }, [role]);

  const requestReturn = useCallback(async (loanId: string): Promise<ReturnResult> => {
    try {
      const dto = await apiReturnBook(loanId);
      const updated = mapLoan(dto);
      setLoans(prev => prev.map(l => l.id === loanId ? updated : l));
      // Increase available copies optimistically
      setBooks(prev =>
        prev.map(b => b.id === updated.bookId ? { ...b, quantity: b.quantity + 1 } : b)
      );
      return { success: true, loan: updated };
    } catch (err: unknown) {
      const message = extractErrorMessage(err) ?? 'Không thể trả sách. Vui lòng thử lại.';
      return { success: false, message };
    }
  }, []);

  const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.name || keycloak.tokenParsed?.email;

  return (
    <AuthContext.Provider value={{
      role, initialized, username,
      books, booksLoading, booksError, refetchBooks,
      loans, loansLoading, loansError, refetchLoans,
      login, forgotPassword, logout,
      borrowBook, requestReturn,
    }}>
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

// Helpers
function extractErrorMessage(err: unknown): string | null {
  if (err && typeof err === 'object') {
    const axiosErr = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
    return axiosErr.response?.data?.message
      ?? axiosErr.response?.data?.error
      ?? axiosErr.message
      ?? null;
  }
  return null;
}
