"use client";

import PageHeader from "@/components/agri/PageHeader";
import OrdersView from "@/components/agri/OrdersView";
import { useT } from "@/context/LanguageContext";

export default function FarmerOrdersPage() {
  const t = useT();
  return (
    <div>
      <PageHeader title={t.orders.title} subtitle={t.farmer.ordersSubtitle} />
      <OrdersView />
    </div>
  );
}
