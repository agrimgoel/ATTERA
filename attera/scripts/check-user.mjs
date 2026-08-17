// Script to check if alan.turing@college.edu exists and print their DOB
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function run() {
  const { data: teacher, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("email", "alan.turing@college.edu")
    .maybeSingle();

  if (error) {
    console.error("Error fetching:", error.message);
  } else if (teacher) {
    console.log("Found teacher:", teacher);
  } else {
    console.log("Teacher not found.");
  }
}

run();
