"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Offer, Transaction } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import ComponentCard from "@/components/common/ComponentCard";
import EmptyState from "@/components/agri/EmptyState";
import StatusBadge from "@/components/agri/StatusBadge";
import Button from "@/components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export default function OrdersView() {
  const t = useT();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [txnCreated, setTxnCreated] = useState<Set<string>>(new Set());

  function refresh() {
    api
      .get<Offer[]>("/offers/mine")
      .then(setOffers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load offers"));
    api
      .get<Transaction[]>("/transactions")
      .then(setTransactions)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load transactions"));
  }

  useEffect(refresh, []);

  async function act(offerId: string, action: "accept" | "reject") {
    setActionError(null);
    setBusyId(offerId);
    try {
      await api.post(`/offers/${offerId}/${action}`);
      refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Failed to ${action} offer`);
    } finally {
      setBusyId(null);
    }
  }

  async function createTransaction(offerId: string) {
    setActionError(null);
    setBusyId(offerId);
    try {
      await api.post(`/transactions?offer_id=${offerId}`);
      setTxnCreated((s) => new Set(s).add(offerId));
      refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to create transaction");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmTransaction(transactionId: string) {
    setActionError(null);
    setBusyId(transactionId);
    try {
      await api.patch(`/transactions/${transactionId}/status`, { status: "confirmed" });
      refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to confirm transaction");
    } finally {
      setBusyId(null);
    }
  }

  const offerColumns = [
    t.orders.cropCol,
    t.orders.quantityCol,
    t.orders.priceCol,
    t.orders.netRealizationCol,
    t.orders.statusCol,
    "",
  ];
  const txnColumns = [
    t.orders.cropCol,
    t.orders.quantityCol,
    t.orders.salePriceCol,
    t.orders.netRealizationCol,
    t.orders.landedCostCol,
    t.orders.statusCol,
    "",
  ];

  return (
    <div className="space-y-6">
      {error && <EmptyState message={error} />}
      {actionError && <p className="text-sm text-error-500">{actionError}</p>}

      <ComponentCard title={t.orders.offersCard} desc={t.orders.offersDesc}>
        {offers && offers.length === 0 && <EmptyState message={t.orders.noOffersYet} />}
        {offers && offers.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  {offerColumns.map((h, i) => (
                    <TableCell
                      key={`${h}-${i}`}
                      isHeader
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {offers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                      {o.crop}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {o.quantity_kg} {t.common.kg}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      ₹{o.price_per_kg}{t.common.perKg}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      ₹{o.net_realization_per_kg}{t.common.perKg}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      {o.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => act(o.id, "accept")} disabled={busyId === o.id}>
                            {t.orders.accept}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => act(o.id, "reject")}
                            disabled={busyId === o.id}
                          >
                            {t.orders.reject}
                          </Button>
                        </div>
                      )}
                      {o.status === "accepted" && !txnCreated.has(o.id) && (
                        <Button size="sm" onClick={() => createTransaction(o.id)} disabled={busyId === o.id}>
                          {t.orders.createTransaction}
                        </Button>
                      )}
                      {o.status === "accepted" && txnCreated.has(o.id) && (
                        <span className="text-xs text-success-600 dark:text-success-500">
                          {t.orders.transactionCreated}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ComponentCard>

      <ComponentCard title={t.orders.transactionsCard} desc={t.orders.transactionsDesc}>
        {transactions && transactions.length === 0 && <EmptyState message={t.orders.noTransactionsYet} />}
        {transactions && transactions.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  {txnColumns.map((h, i) => (
                    <TableCell
                      key={`${h}-${i}`}
                      isHeader
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                      {txn.crop}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {txn.quantity_kg} {t.common.kg}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      ₹{txn.sale_price_per_kg}{t.common.perKg}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      ₹{txn.net_realization_per_kg}{t.common.perKg}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      ₹{txn.landed_cost_per_kg}{t.common.perKg}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={txn.status} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      {txn.status === "pending" && (
                        <Button size="sm" onClick={() => confirmTransaction(txn.id)} disabled={busyId === txn.id}>
                          {t.orders.confirm}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
