package org.pathwaycommons.pathwaycards.web.service;

import com.github.jsonldjava.core.JsonLdError;
import com.github.jsonldjava.core.JsonLdOptions;
import com.github.jsonldjava.core.JsonLdProcessor;
import com.github.jsonldjava.utils.JsonUtils;

import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * @author Ozgun Babur
 */
public class JSONReader
{
	public static void main(String[] args) throws JsonLdError, IOException
	{
		// Open a valid json(-ld) input file
//		InputStream inputStream = new FileInputStream("/home/ozgun/Temp/json-ld-sample.txt");
		InputStream inputStream = new FileInputStream("/home/ozgun/Downloads/ExamplePackage/ExamplePackage/example_10.json");
		// Read the file into an Object (The type of this object will be a List, Map, String, Boolean,
		// Number or null depending on the root object in the file).
		Object jsonObject = JsonUtils.fromInputStream(inputStream);
		// Create a context JSON map containing prefixes and definitions

		LinkedHashMap hm = (LinkedHashMap) jsonObject;
		LinkedHashMap hm2 = (LinkedHashMap) hm.get("extracted_information");
		ArrayList al = (ArrayList) hm2.get("participant_a");
		LinkedHashMap hm3 = (LinkedHashMap) al.get(0);
		hm3.put("in_model", false);

		JsonUtils.writePrettyPrint(new FileWriter("/home/ozgun/Temp/temp.json"), jsonObject);
		System.out.println(JsonUtils.toString(jsonObject));

//		Map context = new HashMap();
//		// Customise context...
//		// Create an instance of JsonLdOptions with the standard JSON-LD options
//		JsonLdOptions options = new JsonLdOptions();
//		// Customise options...
//		options.setUseRdfType(true);
//		// Call whichever JSONLD function you want! (e.g. compact)
//		Object compact = JsonLdProcessor.compact(jsonObject, context, options);
//		// Print out the result (or don't, it's your call!)
//		System.out.println(JsonUtils.toPrettyString(compact));
	}
}
