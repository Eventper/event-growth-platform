import { AlertTriangle, Mail } from "lucide-react";

export default function EmailStatusBanner() {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Email Service Offline</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Email notifications are currently in fallback mode. Event updates and confirmations are being logged but not sent. 
            <br />
            Please provide SendGrid API credentials to enable email delivery.
          </p>
        </div>
      </div>
    </div>
  );
}
