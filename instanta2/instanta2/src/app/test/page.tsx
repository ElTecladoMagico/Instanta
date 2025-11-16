// button.js page
// Este archivo es para probar el botón de pago

// script for the button to appear

"use client";

import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function Home() {
    const createPayment = useMutation(api.payments.createPayment);
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
        
        </main>
    );
}