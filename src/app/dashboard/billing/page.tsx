import BillingForm from "@/components/BillingForm"
import { getUserSubscriptionPlan } from "@/lib/stripe"

const Page = async () => { //create a page for the billing form
    const subscriptionPlan = await getUserSubscriptionPlan() //get the subscription plan the user is on

    return <BillingForm subscriptionPlan={subscriptionPlan} />  //return the billing form with the subscription plan
}

export default Page