"use client";
import { SectionTitle } from "@/components";
import { useProductStore } from "../_zustand/store";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import { z } from "zod";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  lastname: z.string().trim().min(2, "Lastname must be at least 2 characters"),
  phone: z.string().trim().refine(val => val.replace(/[^0-9]/g, '').length >= 10, "Phone number must be at least 10 digits"),
  email: z.string().trim().email("Please enter a valid email address"),
  company: z.string().trim().min(5, "Company must be at least 5 characters"),
  adress: z.string().trim().min(5, "Address must be at least 5 characters"),
  apartment: z.string().trim().min(1, "Apartment is required"),
  city: z.string().trim().min(5, "City must be at least 5 characters"),
  country: z.string().trim().min(5, "Country must be at least 5 characters"),
  postalCode: z.string().trim().min(3, "Postal code must be at least 3 characters"),
  orderNotice: z.string().optional(),
});

const CheckoutPage = () => {
  const { data: session } = useSession();
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    lastname: "",
    phone: "",
    email: "",
    company: "",
    adress: "",
    apartment: "",
    city: "",
    country: "",
    postalCode: "",
    orderNotice: "",
  });
  
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { products, total, clearCart, buyNowItems, clearBuyNowItems } = useProductStore();
  const router = useRouter();

  const handleFieldChange = (field: string, value: string) => {
    setCheckoutForm(prev => ({ ...prev, [field]: value }));
    try {
      const fieldSchema = checkoutSchema.shape[field as keyof typeof checkoutSchema.shape];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setFormErrors((prev) => ({ ...prev, [field]: "" }));
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFormErrors((prev) => ({ ...prev, [field]: error.errors[0].message }));
      }
    }
  };

  // If the user arrived via "Buy Now", scope checkout to that single item only
  const checkoutItems = buyNowItems.length > 0 ? buyNowItems : products;
  const checkoutTotal = checkoutItems.reduce((sum, p) => sum + p.price * p.amount, 0);

  // Add validation functions that match server requirements
  const validateForm = () => {
    const errors: string[] = [];
    
    // Name validation
    if (!checkoutForm.name.trim() || checkoutForm.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters");
    }
    
    // Lastname validation
    if (!checkoutForm.lastname.trim() || checkoutForm.lastname.trim().length < 2) {
      errors.push("Lastname must be at least 2 characters");
    }
    
    // Email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!checkoutForm.email.trim() || !emailRegex.test(checkoutForm.email.trim())) {
      errors.push("Please enter a valid email address");
    }
    
    // Phone validation (must be at least 10 digits)
    const phoneDigits = checkoutForm.phone.replace(/[^0-9]/g, '');
    if (!checkoutForm.phone.trim() || phoneDigits.length < 10) {
      errors.push("Phone number must be at least 10 digits");
    }
    
    // Company validation
    if (!checkoutForm.company.trim() || checkoutForm.company.trim().length < 5) {
      errors.push("Company must be at least 5 characters");
    }
    
    // Address validation
    if (!checkoutForm.adress.trim() || checkoutForm.adress.trim().length < 5) {
      errors.push("Address must be at least 5 characters");
    }
    
    // Apartment validation (updated to 1 character minimum)
    if (!checkoutForm.apartment.trim() || checkoutForm.apartment.trim().length < 1) {
      errors.push("Apartment is required");
    }
    
    // City validation
    if (!checkoutForm.city.trim() || checkoutForm.city.trim().length < 5) {
      errors.push("City must be at least 5 characters");
    }
    
    // Country validation
    if (!checkoutForm.country.trim() || checkoutForm.country.trim().length < 5) {
      errors.push("Country must be at least 5 characters");
    }
    
    // Postal code validation
    if (!checkoutForm.postalCode.trim() || checkoutForm.postalCode.trim().length < 3) {
      errors.push("Postal code must be at least 3 characters");
    }
    
    return errors;
  };

  const makePurchase = async () => {
    // Client-side validation first
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        toast.error(error);
      });
      return;
    }

    // Basic client-side checks for required fields (UX only)
    const requiredFields = [
      'name', 'lastname', 'phone', 'email', 'company', 
      'adress', 'apartment', 'city', 'country', 'postalCode'
    ];
    
    const missingFields = requiredFields.filter(field => 
      !checkoutForm[field as keyof typeof checkoutForm]?.trim()
    );

    if (missingFields.length > 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (checkoutItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (checkoutTotal <= 0) {
      toast.error("Invalid order total");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("🚀 Starting order creation...");
      
      // Get user ID if logged in
      let userId = null;
      if (session?.user?.email) {
        try {
          console.log("🔍 Getting user ID for logged-in user:", session.user.email);
          const userResponse = await apiClient.get(`/api/users/email/${session.user.email}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            userId = userData.id;
            console.log("✅ Found user ID:", userId);
          } else {
            console.log("❌ Could not find user with email:", session.user.email);
          }
        } catch (userError) {
          console.log("⚠️  Error getting user ID:", userError);
        }
      }
      
      // Prepare the order data
      const orderData = {
        name: checkoutForm.name.trim(),
        lastname: checkoutForm.lastname.trim(),
        phone: checkoutForm.phone.trim(),
        email: checkoutForm.email.trim().toLowerCase(),
        company: checkoutForm.company.trim(),
        adress: checkoutForm.adress.trim(),
        apartment: checkoutForm.apartment.trim(),
        postalCode: checkoutForm.postalCode.trim(),
        status: "pending",
        total: checkoutTotal,
        city: checkoutForm.city.trim(),
        country: checkoutForm.country.trim(),
        orderNotice: checkoutForm.orderNotice.trim(),
        userId: userId // Add user ID for notifications
      };

      console.log("📋 Order data being sent:", orderData);

      // Send order data to server for validation and processing
      const response = await apiClient.post("/api/orders", orderData);

      console.log("📡 API Response received:");
      console.log("  Status:", response.status);
      console.log("  Status Text:", response.statusText);
      console.log("  Response OK:", response.ok);
      
      // Check if response is ok before parsing
      if (!response.ok) {
        console.error("❌ Response not OK:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error response body:", errorText);
        
        // Try to parse as JSON to get detailed error info
        try {
          const errorData = JSON.parse(errorText);
          console.error("Parsed error data:", errorData);
          
          // Handle different error types
          if (response.status === 409) {
            // Duplicate order error
            toast.error(errorData.details || errorData.error || "Duplicate order detected");
            return; // Don't throw, just return to stop execution
          } else if (errorData.details && Array.isArray(errorData.details)) {
            // Validation errors
            errorData.details.forEach((detail: any) => {
              toast.error(`${detail.field}: ${detail.message}`);
            });
          } else if (typeof errorData.details === 'string') {
            // Single error message in details
            toast.error(errorData.details);
          } else {
            // Fallback error message
            toast.error(errorData.error || "Order creation failed");
          }
        } catch (parseError) {
          console.error("Could not parse error as JSON:", parseError);
          toast.error("Order creation failed. Please try again.");
        }
        
        return; // Stop execution instead of throwing
      }

      const data = await response.json();
      console.log("✅ Parsed response data:", data);
      
      const orderId: string = data.id;
      console.log("🆔 Extracted order ID:", orderId);

      if (!orderId) {
        console.error("❌ Order ID is missing or falsy!");
        console.error("Full response data:", JSON.stringify(data, null, 2));
        throw new Error("Order ID not received from server");
      }

      console.log("✅ Order ID validation passed, proceeding with product addition...");

      // Add products to order
      for (let i = 0; i < checkoutItems.length; i++) {
        console.log(`🛍️ Adding product ${i + 1}/${checkoutItems.length}:`, {
          orderId,
          productId: checkoutItems[i].id,
          quantity: checkoutItems[i].amount
        });

        await addOrderProduct(orderId, checkoutItems[i].id, checkoutItems[i].amount);
        console.log(`✅ Product ${i + 1} added successfully`);
      }

      console.log(" All products added successfully!");

      // Clear form and the appropriate scope
      setCheckoutForm({
        name: "",
        lastname: "",
        phone: "",
        email: "",
        company: "",
        adress: "",
        apartment: "",
        city: "",
        country: "",
        postalCode: "",
        orderNotice: "",
      });
      if (buyNowItems.length > 0) {
        clearBuyNowItems();
      } else {
        clearCart();
      }
      
      // Refresh notification count if user is logged in
      try {
        // This will trigger a refresh of notifications in the background
        window.dispatchEvent(new CustomEvent('orderCompleted'));
      } catch (error) {
        console.log('Note: Could not trigger notification refresh');
      }
      
      toast.success("Order created successfully! You will be contacted for payment.");
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error: any) {
      console.error("💥 Error in makePurchase:", error);
      
      // Handle server validation errors
      if (error.response?.status === 400) {
        console.log(" Handling 400 error...");
        try {
          const errorData = await error.response.json();
          console.log("Error data:", errorData);
          if (errorData.details && Array.isArray(errorData.details)) {
            // Show specific validation errors
            errorData.details.forEach((detail: any) => {
              toast.error(`${detail.field}: ${detail.message}`);
            });
          } else {
            toast.error(errorData.error || "Validation failed");
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          toast.error("Validation failed");
        }
      } else if (error.response?.status === 409) {
        toast.error("Duplicate order detected. Please wait before creating another order.");
      } else {
        console.log("🔍 Handling generic error...");
        toast.error("Failed to create order. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOrderProduct = async (
    orderId: string,
    productId: string,
    productQuantity: number
  ) => {
    try {
      console.log("️ Adding product to order:", {
        customerOrderId: orderId,
        productId,
        quantity: productQuantity
      });
      
      const response = await apiClient.post("/api/order-product", {
        customerOrderId: orderId,
        productId: productId,
        quantity: productQuantity,
      });

      console.log("📡 Product order response:", response);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Product order failed:", response.status, errorText);
        throw new Error(`Product order failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Product order successful:", data);
      
    } catch (error) {
      console.error("💥 Error creating product order:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (checkoutItems.length === 0) {
      toast.error("You don't have items in your cart");
      router.push("/cart");
    }
  }, []);

  return (
    <div className="bg-white">
      <SectionTitle title="Checkout" path="Home | Cart | Checkout" />
      
      <div className="hidden h-full w-1/2 bg-white lg:block" aria-hidden="true" />
      <div className="hidden h-full w-1/2 bg-gray-50 lg:block" aria-hidden="true" />

      <main className="relative mx-auto grid max-w-screen-2xl grid-cols-1 gap-x-16 lg:grid-cols-2 lg:px-8 xl:gap-x-48">
        <h1 className="sr-only">Order information</h1>

        {/* Order Summary */}
        <section
          aria-labelledby="summary-heading"
          className="bg-gray-50 px-4 pb-10 pt-16 sm:px-6 lg:col-start-2 lg:row-start-1 lg:bg-transparent lg:px-0 lg:pb-16"
        >
          <div className="mx-auto max-w-lg lg:max-w-none">
            <h2 id="summary-heading" className="text-lg font-medium text-gray-900">
              Order summary
            </h2>

            <ul
              role="list"
              className="divide-y divide-gray-200 text-sm font-medium text-gray-900"
            >
              {checkoutItems.map((product) => (
                <li key={product?.id} className="flex items-start space-x-4 py-6">
                  <Image
                    src={product?.image ? `/${product?.image}` : "/product_placeholder.jpg"}
                    alt={product?.title}
                    width={80}
                    height={80}
                    className="h-20 w-20 flex-none rounded-md object-cover object-center"
                  />
                  <div className="flex-auto space-y-1">
                    <h3>{product?.title}</h3>
                    <p className="text-gray-500">x{product?.amount}</p>
                  </div>
                  <p className="flex-none text-base font-medium">
                    ${product?.price}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="hidden space-y-6 border-t border-gray-200 pt-6 text-sm font-medium text-gray-900 lg:block">
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Subtotal</dt>
                <dd>${checkoutTotal}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Shipping</dt>
                <dd>$5</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Taxes</dt>
                <dd>${checkoutTotal / 5}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                <dt className="text-base">Total</dt>
                <dd className="text-base">
                  ${checkoutTotal === 0 ? 0 : Math.round(checkoutTotal + checkoutTotal / 5 + 5)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <form className="px-4 pt-16 sm:px-6 lg:col-start-1 lg:row-start-1 lg:px-0">
          <div className="mx-auto max-w-lg lg:max-w-none">
            {/* Contact Information */}
            <section aria-labelledby="contact-info-heading">
              <h2
                id="contact-info-heading"
                className="text-lg font-medium text-gray-900"
              >
                Contact information
              </h2>

              <div className="mt-6">
                <label
                  htmlFor="name-input"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name * (min 2 characters)
                </label>
                <div className="mt-1">
                  <input
                    value={checkoutForm.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    type="text"
                    id="name-input"
                    name="name-input"
                    autoComplete="given-name"
                    required
                    disabled={isSubmitting}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="lastname-input"
                  className="block text-sm font-medium text-gray-700"
                >
                  Lastname * (min 2 characters)
                </label>
                <div className="mt-1">
                  <input
                    value={checkoutForm.lastname}
                    onChange={(e) => handleFieldChange("lastname", e.target.value)}
                    type="text"
                    id="lastname-input"
                    name="lastname-input"
                    autoComplete="family-name"
                    required
                    disabled={isSubmitting}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" />
                    {formErrors.lastname && <p className="text-red-500 text-xs mt-1">{formErrors.lastname}</p>}
                </div>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="phone-input"
                  className="block text-sm font-medium text-gray-700"
                >
                  Phone number * (min 10 digits)
                </label>
                <div className="mt-1">
                  <input
                    value={checkoutForm.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    type="tel"
                    id="phone-input"
                    name="phone-input"
                    autoComplete="tel"
                    required
                    disabled={isSubmitting}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" />
                    {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                </div>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="email-address"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address *
                </label>
                <div className="mt-1">
                  <input
                    value={checkoutForm.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    type="email"
                    id="email-address"
                    name="email-address"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed" />
                    {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>
              </div>
            </section>

            {/* Payment Notice */}
            <section className="mt-10">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Payment Information
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Payment will be processed after order confirmation. You will be contacted for payment details.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Shipping Address */}
            <section aria-labelledby="shipping-heading" className="mt-10">
              <h2
                id="shipping-heading"
                className="text-lg font-medium text-gray-900"
              >
                Shipping address
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Company *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="company"
                      name="company"
                      required
                      disabled={isSubmitting}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={checkoutForm.company}
                      onChange={(e) => handleFieldChange("company", e.target.value)}
                    />
                    {formErrors.company && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.company}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Address *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="address"
                      name="address"
                      autoComplete="street-address"
                      required
                      disabled={isSubmitting}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={checkoutForm.adress}
                      onChange={(e) => handleFieldChange("adress", e.target.value)}
                    />
                    {formErrors.adress && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.adress}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="apartment"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Apartment, suite, etc. * (required)
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="apartment"
                      name="apartment"
                      required
                      disabled={isSubmitting}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={checkoutForm.apartment}
                      onChange={(e) => handleFieldChange("apartment", e.target.value)}
                    />
                    {formErrors.apartment && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.apartment}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-gray-700"
                  >
                    City *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="city"
                      name="city"
                      autoComplete="address-level2"
                      required
                      disabled={isSubmitting}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={checkoutForm.city}
                      onChange={(e) => handleFieldChange("city", e.target.value)}
                    />
                    {formErrors.city && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="region"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Country *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="region"
                      name="region"
                      autoComplete="address-level1"
                      required
                      disabled={isSubmitting}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={checkoutForm.country}
                      onChange={(e) => handleFieldChange("country", e.target.value)}
                    />
                    {formErrors.country && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.country}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="postal-code"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Postal code *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="postal-code"
                      name="postal-code"
                      autoComplete="postal-code"
                      required
                      disabled={isSubmitting}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={checkoutForm.postalCode}
                      onChange={(e) => handleFieldChange("postalCode", e.target.value)}
                    />
                    {formErrors.postalCode && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.postalCode}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="order-notice"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Order notice
                  </label>
                  <div className="mt-1">
                    <textarea
                      className="textarea textarea-bordered textarea-lg w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                      id="order-notice"
                      name="order-notice"
                      autoComplete="order-notice"
                      disabled={isSubmitting}
                      value={checkoutForm.orderNotice}
                      onChange={(e) => handleFieldChange("orderNotice", e.target.value)}
                    ></textarea>
                    {formErrors.orderNotice && <p className="text-red-500 text-xs mt-1">{formErrors.orderNotice}</p>}
                    {formErrors.orderNotice && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.orderNotice}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-10 border-t border-gray-200 pt-6 ml-0">
              <button
                type="button"
                onClick={makePurchase}
                disabled={isSubmitting}
                className="w-full rounded-md border border-transparent bg-blue-500 px-20 py-2 text-lg font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-gray-50 sm:order-last disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Processing Order..." : "Place Order"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CheckoutPage;
