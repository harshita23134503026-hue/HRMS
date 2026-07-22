import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { X, Users, UserRoundCheck } from 'lucide-react';
import { db } from '../firebase'; // Update path if needed

const LEAVE_FIELDS = [
  { key: 'plannedLeave', label: 'Planned Leave' },
  { key: 'sickLeave', label: 'Sick Leave' },
  { key: 'casualLeave', label: 'Casual Leave' },
  { key: 'specialLeave', label: 'Special Leave' },
  { key: 'workFromHome', label: 'Work From Home' },
  { key: 'lossOfPay', label: 'Loss of Pay' },
];

const EMPTY_COUNTS = {
  plannedLeave: 0,
  sickLeave: 0,
  casualLeave: 0,
  specialLeave: 0,
  workFromHome: 0,
  lossOfPay: 0,
};

// john.doe@gmail.com => john_doe@gmail_com
export const leaveDocumentId = (email = '') => email.replace(/\./g, '_');

export default function LeaveBalanceEditorModal({
  isOpen,
  onClose,
  currentUserEmail,
}) {
  const [scope, setScope] = useState('all');
  const [users, setUsers] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        setError('');

        // Assumes you have a Firestore "users" collection
        // and every user document has at least { email, name }.
        const snapshot = await getDocs(collection(db, 'users'));

        const userList = snapshot.docs
          .map((userDoc) => ({
            id: userDoc.id,
            email: userDoc.data().email,
            name: userDoc.data().name || userDoc.data().displayName || '',
          }))
          .filter((user) => user.email);

        setUsers(userList);
      } catch (err) {
        console.error(err);
        setError('Unable to load users. Please try again.');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [isOpen]);

  const selectedUserCount = useMemo(() => {
    return scope === 'all' ? users.length : selectedEmails.length;
  }, [scope, users.length, selectedEmails.length]);

  if (!isOpen) return null;

  const toggleUser = (email) => {
    setSelectedEmails((previous) =>
      previous.includes(email)
        ? previous.filter((item) => item !== email)
        : [...previous, email]
    );
  };

  const updateCount = (key, value) => {
    const numericValue = Math.max(0, Number(value) || 0);

    setCounts((previous) => ({
      ...previous,
      [key]: numericValue,
    }));
  };

  const handleCancel = () => {
    setScope('all');
    setSelectedEmails([]);
    setCounts(EMPTY_COUNTS);
    setError('');
    onClose();
  };

  const handleSave = async () => {
    const hasAtLeastOneLeaveValue = Object.values(counts).some(
      (value) => Number(value) > 0
    );

    if (!hasAtLeastOneLeaveValue) {
      setError('Please enter a leave count greater than 0.');
      return;
    }

    const targetEmails =
      scope === 'all' ? users.map((user) => user.email) : selectedEmails;

    if (!targetEmails.length) {
      setError('Please select at least one user.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      /*
        Firestore write batches allow up to 500 writes.
        Keeping each batch at 450 provides a safety margin.
      */
      const chunks = [];
      for (let i = 0; i < targetEmails.length; i += 450) {
        chunks.push(targetEmails.slice(i, i + 450));
      }

      for (const emailChunk of chunks) {
        const batch = writeBatch(db);

        emailChunk.forEach((email) => {
          const leaveRef = doc(db, 'leave', leaveDocumentId(email));

          batch.set(
            leaveRef,
            {
              email,
              plannedLeave: increment(counts.plannedLeave),
              sickLeave: increment(counts.sickLeave),
              casualLeave: increment(counts.casualLeave),
              specialLeave: increment(counts.specialLeave),
              workFromHome: increment(counts.workFromHome),
              lossOfPay: increment(counts.lossOfPay),
              updatedBy: currentUserEmail || '',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        });

        await batch.commit();
      }

      handleCancel();
    } catch (err) {
      console.error('Error saving leave balance:', err);
      setError('Could not save leave balances. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) handleCancel();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-100 bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Edit Leave Balance
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Add leave counts for all employees or selected employees.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="text-slate-400 transition-colors hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
              scope === 'all'
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users
              className={`h-5 w-5 ${
                scope === 'all' ? 'text-blue-600' : 'text-slate-400'
              }`}
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">All Users</p>
              <p className="text-[11px] text-slate-400">
                Apply leave counts to every user.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setScope('custom')}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
              scope === 'custom'
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <UserRoundCheck
              className={`h-5 w-5 ${
                scope === 'custom' ? 'text-blue-600' : 'text-slate-400'
              }`}
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Custom Users
              </p>
              <p className="text-[11px] text-slate-400">
                Choose specific employees.
              </p>
            </div>
          </button>
        </div>

        {scope === 'custom' && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold text-slate-600">
              Select users
            </p>

            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200">
              {loadingUsers ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  Loading users…
                </p>
              ) : users.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  No users found in the <code>users</code> collection.
                </p>
              ) : (
                users.map((user) => (
                  <label
                    key={user.email}
                    className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(user.email)}
                      onChange={() => toggleUser(user.email)}
                      className="h-4 w-4 accent-blue-600"
                    />

                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        {user.name || 'Unnamed User'}
                      </p>
                      <p className="text-[11px] text-slate-400">{user.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mb-4">
          <p className="mb-3 text-xs font-semibold text-slate-600">
            Add leave count
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LEAVE_FIELDS.map((field) => (
              <label key={field.key}>
                <span className="mb-1.5 block text-xs font-medium text-slate-500">
                  {field.label}
                </span>

                <input
                  type="number"
                  min="0"
                  value={counts[field.key]}
                  onChange={(event) =>
                    updateCount(field.key, event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
              </label>
            ))}
          </div>
        </div>

        <p className="mb-4 text-[11px] text-slate-400">
          This will be applied to <b>{selectedUserCount}</b> user
          {selectedUserCount === 1 ? '' : 's'}.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingUsers}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Leave Balance'}
          </button>
        </div>
      </div>
    </div>
  );
}