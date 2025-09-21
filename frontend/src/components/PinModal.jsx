import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PinModal({ open, pin, setPin, onClose, onUnlock }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="p-6 w-96">
        <CardContent>
          <h2 className="text-xl font-semibold mb-4">Enter PIN</h2>
          <input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="border rounded w-full p-2 mb-4"
          />
          <div className="flex justify-end space-x-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={onUnlock}>Unlock</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
