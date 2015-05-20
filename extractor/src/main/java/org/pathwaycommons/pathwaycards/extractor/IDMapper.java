package org.pathwaycommons.pathwaycards.extractor;

import org.biopax.paxtools.model.BioPAXElement;
import org.biopax.paxtools.model.Model;
import org.biopax.paxtools.model.level3.*;
import org.biopax.paxtools.pattern.util.Blacklist;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * @author Ozgun Babur
 */
public class IDMapper
{
	public static String getUniProtName(Named named)
	{
		Set<String> names = new HashSet<>();
		for (String name : named.getName())
		{
			if (name.endsWith("_HUMAN")) names.add(name);
		}

		return names.size() == 1 ? names.iterator().next() : null;
	}

	public static String getHGNCSymbol(XReferrable xrable)
	{
		Set<String> symbols = new HashSet<>();
		for (Xref xref : xrable.getXref())
		{
			String db = xref.getDb();
			if (db != null)
			{
				db = db.toLowerCase();
				if (db.equals("hgnc symbol"))
				{
					String sym = xref.getId();
					if (sym != null) symbols.add(sym);
				}
			}
		}
		return symbols.size() == 1 ? symbols.iterator().next() : null;
	}

	public static Map<String, String> getUniProtName2HGNCSymbolMap(Model model)
	{
		Map<String, String> map = new HashMap<>();
		for (SequenceEntityReference ser : model.getObjects(SequenceEntityReference.class))
		{
			String uN = getUniProtName(ser);
			if (uN != null)
			{
				String hN = getHGNCSymbol(ser);
				if (hN != null)
				{
					map.put(uN, hN);
				}
			}
		}
		return map;
	}

	public static void writeMap(Map<String, String> map, String filename) throws IOException
	{
		BufferedWriter writer = new BufferedWriter(new FileWriter(filename));

		for (String uN : map.keySet())
		{
			writer.write(uN + "\t" + map.get(uN) + '\n');
		}

		writer.close();
	}
}
