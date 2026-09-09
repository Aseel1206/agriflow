"use client";

import PageHeader from "@/components/agri/PageHeader";
import OrdersView from "@/components/agri/OrdersView";
import { useT } from "@/context/LanguageContext";

export default function BuyerOrdersPage() {
  const t = useT();
  return (
    <div>
      <PageHeader title={t.orders.title} subtitle={t.buyer.ordersSubtitle} />
      <OrdersView />
    </div>
  );
}
