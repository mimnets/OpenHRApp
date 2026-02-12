import React from 'react';
import { XCircle, Mail } from 'lucide-react';

interface SuspendedPageProps {
  organizationName?: string;
  onLogout: () => void;
}

export const SuspendedPage: React.FC<SuspendedPageProps> = ({
  organizationName,
  onLogout
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Account Suspended
        </h1>

        {organizationName && (
          <p className="text-slate-500 mb-4">{organizationName}</p>
        )}

        <p className="text-slate-600 mb-6">
          Your organization's account has been suspended. This may be due to:
        </p>

        <ul className="text-left text-slate-600 mb-6 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span>Payment issues or subscription lapse</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span>Terms of service violation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span>Administrative action pending review</span>
          </li>
        </ul>

        <div className="border-t pt-6 mb-6">
          <p className="text-slate-600 mb-4">Contact us to resolve this issue:</p>
          <div className="flex flex-col gap-2 text-sm">
            <a href="mailto:support@openhr.app" className="flex items-center justify-center gap-2 text-primary hover:underline">
              <Mail className="w-4 h-4" />
              support@openhr.app
            </a>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
