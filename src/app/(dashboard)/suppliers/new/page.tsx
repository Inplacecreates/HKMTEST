"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const SUPPLIER_CATEGORIES = [
  "Building Materials", "Steel & Metal", "Timber & Wood", "Plumbing",
  "Electrical", "Paint & Finishing", "Hardware", "Transport",
  "Equipment Rental", "Safety Equipment",
];

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name) {
      setError("Supplier name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactPerson: contactPerson || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          paymentTerms: paymentTerms || undefined,
          categories: selectedCategories,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create supplier");
      }

      const supplier = await res.json();
      router.push(`/suppliers/${supplier.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/suppliers">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Supplier</h1>
          <p className="text-sm text-gray-500">Add a new supplier to your database</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Basic Info</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Supplier Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bamburi Cement Ltd" />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254..." />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30, COD" />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Physical address" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {SUPPLIER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                    selectedCategories.includes(cat)
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-primary-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/suppliers"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Add Supplier"}
          </Button>
        </div>
      </form>
    </div>
  );
}
