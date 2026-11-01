import { supabase } from "./client.js"

export async function proposeAgreement(application_id, amount) {
  const { error } = await supabase.rpc("propose_job_agreement", {
    p_application_id: application_id,
    p_amount: amount,
  })
  if (error) throw error
  return true
}

export async function answerAgreement(application_id, is_confirmed) {
  const { error } = await supabase.rpc("answer_job_agreement", {
    p_application_id: application_id,
    p_is_confirmed: is_confirmed,
  })
  if (error) throw error
  return true
}

export async function answerSettlement(application_id, is_settled) {
  const { error } = await supabase.rpc("answer_job_settlement", {
    p_application_id: application_id,
    p_is_settled: is_settled,
  })
  if (error) throw error
  return true
}
